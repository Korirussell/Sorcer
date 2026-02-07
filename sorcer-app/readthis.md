# 🧙‍♂️ Sourcer: The AI Carbon Arbitrage Engine.

> **Hackathon Track Targets:** Cox Enterprises (Sustainability), State Farm (Community Impact), Best Overall.

## 💡 The Problem
Not all AI Compute is created equal. 
Asking GPT-4 a question at **2 PM in Virginia** (Coal-heavy grid + High Heat) generates **5x more carbon** than asking the same question to a model hosted in **Oregon** (Hydro + Cool Air).

Current tools treat all AI as "generic cloud." They ignore the physical reality of the data center.

## 🔮 The Solution: Sourcer
Sourcer is a **Real-Time Carbon Arbitrage Engine** for developers. and also just normal people.  
It doesn't just switch you to a "weaker" model. It dynamically routes your prompt to the **cleanest available intelligence** based on live environmental data.

### 🌟 Core Features

#### 1. The "Oracle" (Dynamic Model Selector)
* **Real-Time Routing:** Our backend monitors the "Weather" of the internet. It tracks:
    * **Grid Intensity:** (Coal vs. Solar) in major data center regions (US-East, US-West, EU-North).
    * **Ambient Temperature:** Real-time weather at server farms (Hotter = More Water for Cooling).
* **The "Smart Switch":** When you type a prompt, Sourcer calculates the lowest-carbon path.
    * *Example:* "Right now, **Claude 3.5** (Oregon) is cleaner than **GPT-4** (Virginia). Switching route..."

#### 2. The "Forecast" (ML Prediction)
* **Predictive Scheduling:** Just like a weather forecast, we predict the "Carbon Weather" for the next 24 hours.
* **The "Night Owl" Agent:** Users can schedule non-urgent tasks. Our ML model picks the exact minute (e.g., 3:42 AM) when wind energy peaks to execute the prompt.

#### 3. The "Sanctum" (Dashboard)
* **Live Impact Map:** A visualization of the US Data Center network. Users see "packets" (prompts) routing around "Storms" (Coal-heavy regions) to reach "Sanctuaries" (Green regions).
* **Community Impact:** Tracks total carbon diverted from dirty grids.

---