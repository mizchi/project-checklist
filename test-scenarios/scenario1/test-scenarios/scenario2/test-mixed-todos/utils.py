# Utility functions

# TODO: Add input validation
def process_data(data):
    # FIXME: Handle edge cases
    return data.upper()

# NOTE: This function needs optimization
def calculate_statistics(numbers):
    # TODO: Add error handling for empty lists
    # TODO: Implement median calculation
    
    # Checklist:
    # - [x] Calculate mean
    # - [ ] Calculate median
    # - [ ] Calculate mode
    # - [ ] Add variance calculation
    
    if not numbers:
        return None
    
    return sum(numbers) / len(numbers)

# HACK: Quick fix for timezone issues
def get_current_time():
    # TODO: Use proper timezone library
    return "2024-01-01 00:00:00"