from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import random
import logging
from dataclasses import dataclass
from typing import Dict, Optional, List
import time
from enum import Enum

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'deal-or-no-deal-secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=True)

class GamePhase(Enum):
    NOT_STARTED = "not_started"
    CASE_SELECTION = "case_selection"
    OPENING_CASES = "opening_cases"
    OFFER_PHASE = "offer_phase"
    DEAL_TAKEN = "deal_taken"
    GAME_OVER = "game_over"

@dataclass
class Case:
    value: float
    opened: bool = False
    selected: bool = False

    def to_dict(self):
        return {
            "value": self.value,
            "opened": self.opened,
            "selected": self.selected
        }

@dataclass
class BankerOffer:
    amount: float
    round_number: int
    timestamp: float
    auto_generated: bool

class GameState:
    CASE_VALUES = [
        0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1000,
        5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000,
        500000, 750000, 1000000
    ]

    CASES_PER_ROUND = {
        1: 6,  # First round: 6 cases
        2: 5,  # Second round: 5 cases
        3: 4,  # Third round: 4 cases
        4: 3,  # Fourth round: 3 cases
        5: 2,  # Fifth round: 2 cases
        6: 1,  # Sixth round: 1 case
    }

    def __init__(self):
        self.reset_game()

    def reset_game(self):
        self.cases: Dict[str, Case] = {}
        self.selected_case: Optional[str] = None
        self.current_offer: Optional[float] = None
        self.game_started: bool = False
        self.player_name: Optional[str] = None
        self.phase: GamePhase = GamePhase.NOT_STARTED
        self.start_time: Optional[float] = None
        self.last_offer_time: Optional[float] = None
        self.offers_made: List[BankerOffer] = []
        self.cases_remaining: int = 26
        self.cases_to_open: int = self.CASES_PER_ROUND[1]
        self.round_number: int = 1
        self.suggested_offer: Optional[float] = None
        logger.info("Game state reset")

    def initialize_cases(self, player_name: str) -> Dict[str, Case]:
        """Initialize the game with shuffled case values."""
        logger.info(f"Initializing new game for player: {player_name}")
        values = self.CASE_VALUES.copy()
        random.shuffle(values)
        
        self.cases = {
            str(i): Case(value=value) for i, value in enumerate(values, 1)
        }
        self.game_started = True
        self.player_name = player_name
        self.phase = GamePhase.CASE_SELECTION
        self.start_time = time.time()
        self.cases_remaining = len(self.cases)
        logger.info(f"Game initialized with {self.cases_remaining} cases")
        return self.get_cases_dict()

    def get_cases_dict(self) -> dict:
        """Convert cases to dictionary format for JSON serialization."""
        return {num: case.to_dict() for num, case in self.cases.items()}

    def select_case(self, case_number: str) -> bool:
        """Handle initial case selection by player."""
        logger.info(f"Attempting to select case {case_number}")
        
        if self.phase != GamePhase.CASE_SELECTION:
            logger.warning(f"Cannot select case in phase {self.phase}")
            return False
        
        if case_number not in self.cases:
            logger.warning(f"Invalid case number: {case_number}")
            return False

        self.selected_case = case_number
        self.cases[case_number].selected = True
        self.phase = GamePhase.OPENING_CASES
        logger.info(f"Case {case_number} selected successfully")
        return True

    def open_case(self, case_number: str) -> Optional[float]:
        """Open a case and return its value."""
        logger.info(f"Attempting to open case {case_number}")
        
        if self.phase != GamePhase.OPENING_CASES:
            logger.warning(f"Cannot open case in phase {self.phase}")
            return None

        if case_number not in self.cases or self.cases[case_number].opened:
            logger.warning(f"Invalid case opening attempt: {case_number}")
            return None

        case = self.cases[case_number]
        case.opened = True
        self.cases_remaining -= 1
        self.cases_to_open -= 1

        logger.info(f"Case {case_number} opened. Value: ${case.value}")
        logger.info(f"Cases remaining in round: {self.cases_to_open}")

        # Check if we've opened all cases for this round
        if self.cases_to_open == 0:
            logger.info(f"Round {self.round_number} completed")
            self.phase = GamePhase.OFFER_PHASE
            self.suggested_offer = self.calculate_suggested_offer()
            logger.info(f"Moving to offer phase. Suggested offer: ${self.suggested_offer}")

        return case.value

    def update_cases_to_open(self):
        """Update the number of cases to open for the next round."""
        self.round_number += 1
        self.cases_to_open = self.CASES_PER_ROUND.get(self.round_number, 1)
        logger.info(f"Updated to round {self.round_number}. Cases to open: {self.cases_to_open}")

    def calculate_suggested_offer(self) -> float:
        """Calculate suggested banker's offer based on remaining cases."""
        unopened_values = [
            case.value for case in self.cases.values()
            if not case.opened and not case.selected
        ]
        expected_value = sum(unopened_values) / len(unopened_values)
        round_factor = min(0.9, 0.3 + (self.round_number * 0.1))
        offer = round(expected_value * round_factor, 2)
        logger.info(f"Calculated suggested offer: ${offer}")
        return offer

    def get_game_state(self) -> dict:
        """Get complete game state for clients."""
        return {
            "cases": self.get_cases_dict(),
            "selectedCase": self.selected_case,
            "currentOffer": self.current_offer,
            "suggestedOffer": self.suggested_offer,
            "gameStarted": self.game_started,
            "playerName": self.player_name,
            "phase": self.phase.value,
            "roundNumber": self.round_number,
            "casesToOpen": self.cases_to_open,
            "casesRemaining": self.cases_remaining,
            "offerHistory": [(o.amount, o.auto_generated) for o in self.offers_made]
        }

# Initialize game state
game_state = GameState()

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    logger.info('Client connected')
    emit('game_state', game_state.get_game_state())

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    logger.info('Client disconnected')

@socketio.on('start_game')
def handle_start_game(data):
    """Start a new game."""
    try:
        player_name = data.get('playerName')
        if not player_name:
            logger.error("No player name provided")
            emit('error', {'message': 'Player name is required'})
            return

        cases = game_state.initialize_cases(player_name)
        logger.info(f'Game started for player: {player_name}')
        emit('game_started', game_state.get_game_state(), broadcast=True)
    except Exception as e:
        logger.error(f'Error starting game: {e}', exc_info=True)
        emit('error', {'message': 'Failed to start game'})

@socketio.on('select_case')
def handle_select_case(data):
    """Handle initial case selection."""
    try:
        case_number = str(data.get('caseNumber'))
        if game_state.select_case(case_number):
            logger.info(f'Case selected: {case_number}')
            emit('case_selected', game_state.get_game_state(), broadcast=True)
        else:
            emit('error', {'message': 'Invalid case selection'})
    except Exception as e:
        logger.error(f'Error selecting case: {e}', exc_info=True)
        emit('error', {'message': 'Failed to select case'})

@socketio.on('open_case')
def handle_open_case(data):
    """Handle opening a case."""
    try:
        case_number = str(data.get('caseNumber'))
        value = game_state.open_case(case_number)
        if value is not None:
            game_state_data = game_state.get_game_state()
            emit('case_opened', game_state_data, broadcast=True)
            
            if game_state.phase == GamePhase.OFFER_PHASE:
                emit('suggest_offer', {
                    'suggestedOffer': game_state.suggested_offer
                }, broadcast=True)
        else:
            emit('error', {'message': 'Invalid case opening'})
    except Exception as e:
        logger.error(f'Error opening case: {e}', exc_info=True)
        emit('error', {'message': 'Failed to open case'})

@socketio.on('make_offer')
def handle_make_offer(data):
    """Handle banker making an offer."""
    try:
        if game_state.phase != GamePhase.OFFER_PHASE:
            emit('error', {'message': 'Cannot make offer at this time'})
            return

        offer_amount = float(data.get('offer'))
        use_suggested = data.get('useSuggested', False)
        
        if use_suggested:
            offer_amount = game_state.suggested_offer

        game_state.current_offer = offer_amount
        game_state.offers_made.append(BankerOffer(
            amount=offer_amount,
            round_number=game_state.round_number,
            timestamp=time.time(),
            auto_generated=use_suggested
        ))
        
        logger.info(f'Offer made: ${offer_amount} ({"auto" if use_suggested else "manual"})')
        emit('new_offer', game_state.get_game_state(), broadcast=True)
    except Exception as e:
        logger.error(f'Error making offer: {e}', exc_info=True)
        emit('error', {'message': 'Failed to make offer'})

@socketio.on('admin_handle_offer')
def handle_admin_offer_response(data):
    """Handle admin forcing a deal/no deal decision."""
    try:
        if game_state.phase != GamePhase.OFFER_PHASE:
            emit('error', {'message': 'No active offer to handle'})
            return

        accepted = data.get('accepted', False)
        logger.info(f'Admin forcing offer {"acceptance" if accepted else "rejection"}')

        if accepted:
            game_state.phase = GamePhase.DEAL_TAKEN
            emit('deal_taken', game_state.get_game_state(), broadcast=True)
            logger.info(f'Admin accepted offer: ${game_state.current_offer}')
        else:
            game_state.phase = GamePhase.OPENING_CASES
            game_state.current_offer = None
            game_state.update_cases_to_open()
            emit('offer_rejected', game_state.get_game_state(), broadcast=True)
            logger.info('Admin rejected offer, moving to next round')
            
    except Exception as e:
        logger.error(f'Error handling admin offer response: {e}', exc_info=True)
        emit('error', {'message': 'Failed to process admin offer response'})

@socketio.on('reject_offer')
def handle_reject_offer():
    """Handle player rejecting banker's offer."""
    try:
        logger.info(f'Current phase: {game_state.phase.value}')
        if game_state.phase != GamePhase.OFFER_PHASE:
            logger.warning('Attempted to reject offer in wrong phase')
            emit('error', {'message': 'Cannot reject offer at this time'})
            return

        logger.info('Processing offer rejection')
        game_state.phase = GamePhase.OPENING_CASES
        game_state.current_offer = None
        game_state.update_cases_to_open()
        
        state_update = game_state.get_game_state()
        logger.info(f'New state after rejection: {state_update}')
        emit('offer_rejected', state_update, broadcast=True)
        
    except Exception as e:
        logger.error(f'Error rejecting offer: {e}', exc_info=True)
        emit('error', {'message': 'Failed to reject offer'})

@socketio.on('accept_offer')
def handle_accept_offer():
    """Handle player accepting banker's offer."""
    try:
        if game_state.phase != GamePhase.OFFER_PHASE:
            emit('error', {'message': 'Cannot accept offer at this time'})
            return

        game_state.phase = GamePhase.DEAL_TAKEN
        state_update = game_state.get_game_state()
        emit('deal_taken', state_update, broadcast=True)
        logger.info(f'Offer accepted: ${game_state.current_offer}')
    except Exception as e:
        logger.error(f'Error accepting offer: {e}', exc_info=True)
        emit('error', {'message': 'Failed to accept offer'})
    """Handle player rejecting banker's offer."""
    try:
        if game_state.phase == GamePhase.OFFER_PHASE:
            game_state.phase = GamePhase.OPENING_CASES
            game_state.current_offer = None
            game_state.update_cases_to_open()
            logger.info('Offer rejected, moving to next round')
            emit('offer_rejected', game_state.get_game_state(), broadcast=True)
    except Exception as e:
        logger.error(f'Error rejecting offer: {e}', exc_info=True)
        emit('error', {'message': 'Failed to reject offer'})

@socketio.on('reset_game')
def handle_reset_game():
    """Reset the game state."""
    try:
        game_state.reset_game()
        logger.info('Game reset')
        emit('game_reset', game_state.get_game_state(), broadcast=True)
    except Exception as e:
        logger.error(f'Error resetting game: {e}', exc_info=True)
        emit('error', {'message': 'Failed to reset game'})

@app.route('/api/game-state')
def get_game_state():
    """HTTP endpoint to get current game state."""
    return jsonify(game_state.get_game_state())

if __name__ == '__main__':
    logger.info('Starting Flask-SocketIO server...')
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)