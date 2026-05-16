import os
import asyncio
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.DEBUG)
load_dotenv()

import omium
omium.init(api_key=os.getenv("OMIUM_API_KEY"))

@omium.trace("my_debug_step")
async def do_step():
    print("Doing debug step...")
    await asyncio.sleep(0.5)

@omium.agent
async def main():
    print("Agent started...")
    await do_step()
    print("Agent finished.")
    
    # Wait for background queue to flush
    print("Waiting 5 seconds for Omium to flush traces...")
    await asyncio.sleep(5)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
