def fibonacci(n):
    """
    Generate the Fibonacci sequence up to n terms.
    
    Args:
        n (int): Number of terms to generate
        
    Returns:
        list: The Fibonacci sequence
    """
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[-1] + sequence[-2])
    
    return sequence

# Example usage
if __name__ == "__main__":
    # Generate first 10 Fibonacci numbers
    result = fibonacci(10)
    print(f"First 10 Fibonacci numbers: {result}")
    
    # Calculate sum
    total = sum(result)
    print(f"Sum of first 10 Fibonacci numbers: {total}")
