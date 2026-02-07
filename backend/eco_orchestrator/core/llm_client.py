import google.generativeai as genai
import os

class LLMClient:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

    async def generate(self, prompt: str, model_name: str):
        model = genai.GenerativeModel(model_name)
        # Actual API call happens here
        response = await model.generate_content_async(prompt)
        return response.text

    async def raw_llm_generate(self, prompt: str, model_name: str):
        model = genai.GenerativeModel(model_name)
        response = await model.generate_content_async(prompt)
        return response.text
    