import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

try:
    import omium
    print("Omium version:", getattr(omium, '__version__', 'unknown'))
    omium.init(api_key=os.getenv("OMIUM_API_KEY"))
    _trace = omium.trace
except Exception as e:
    print("Error initializing omium:", e)
    def _trace(name=None):
        def decorator(func): return func
        return decorator

@_trace("test_operation")
async def dummy_operation():
    print("Executing dummy operation...")
    await asyncio.sleep(1)
    return {"status": "success"}

async def main():
    print("Starting trace test...")
    await dummy_operation()
    print("Finished trace test.")
    
    # Check if omium has a flush method, since script might exit before background thread sends data
    if hasattr(omium, 'flush'):
        print("Flushing omium data...")
        omium.flush()
    elif hasattr(omium, 'shutdown'):
        print("Shutting down omium...")
        omium.shutdown()
        
if __name__ == "__main__":
    asyncio.run(main())
