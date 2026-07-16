"""OpenAI-backed vision adapter for menu scan beer-name extraction."""

from openai import AsyncOpenAI

_EXTRACT_PROMPT = (
    "Extract every beer name listed on this menu or tap board image. "
    "Return one beer name per line with no numbering, bullets, or extra commentary."
)


class OpenAILLMClient:
    """Adapter exposing menu vision extraction over the OpenAI chat API."""

    def __init__(self, client: AsyncOpenAI) -> None:
        self._client = client

    async def extract_beer_names(self, image_base64: str) -> list[str]:
        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": _EXTRACT_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                        },
                    ],
                }
            ],
            max_tokens=500,
            temperature=0.2,
        )
        text = response.choices[0].message.content or ""
        return [
            line.strip().lstrip("-•0123456789. ").strip()
            for line in text.splitlines()
            if line.strip()
        ]
