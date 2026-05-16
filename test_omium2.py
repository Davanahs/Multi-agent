import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

import omium
omium.init(api_key=os.getenv("OMIUM_API_KEY"))

@omium.trace("my_step")
async def do_step():
    print("Step is running...")
    await asyncio.sleep(1)
    return "Step completed"

# Try using the @agent decorator which might create the required execution context
@omium.agent
async def main_agent():
    print("Agent started...")
    res = await do_step()
    print(res)
    print("Agent finished.")

if __name__ == "__main__":
    asyncio.run(main_agent())
