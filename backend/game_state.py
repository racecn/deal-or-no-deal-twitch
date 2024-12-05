class GameState:
    def __init__(self):
        self.cases = {str(i): {"value": None, "opened": False} for i in range(1, 27)}
        self.selected_case = None
        self.current_offer = None
        self.game_started = False
