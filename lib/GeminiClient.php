<?php
declare(strict_types=1);

class GeminiClient {
    private string $apiKey;
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function __construct() {
        $this->apiKey = $_ENV['GEMINI_API_KEY'] ?? '';
    }

    private function post(string $model, array $payload): array {
        $url = "{$this->baseUrl}/{$model}:generateContent?key={$this->apiKey}";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_TIMEOUT        => 60,
        ]);
        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($httpCode !== 200) {
            throw new RuntimeException("Gemini API error (HTTP {$httpCode}): {$responseBody}");
        }
        return json_decode($responseBody, true);
    }

    public function classifyEmail(string $subject, string $body): array {
        $prompt = <<<PROMPT
You are an email triage assistant for a business inbox.

Analyze the email and return structured JSON only.

Tasks:
1. Categorize into one of: sales, support, billing, spam, general
2. Extract: urgency (low/medium/high), sentiment (positive/neutral/negative),
   intent, summary, sender_name, sender_email, company_name,
   requested_action, requires_human_review (bool), confidence (0.0-1.0)

Rules: Be accurate. Use null for unknown fields. Output valid JSON only.

Email Subject: {$subject}
Email Body: {$this->truncate($body, 2500)}
PROMPT;

        $response = $this->post('gemini-2.0-flash', [
            'contents' => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.1,
            ]
        ]);

        $text = $response['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
        // Strip markdown code fences if present
        $text = preg_replace('/^```json\s*|\s*```$/s', '', trim($text));
        return json_decode($text, true) ?? [];
    }

    public function generateDraft(
        string $subject,
        string $body,
        string $fromName,
        string $fromEmail,
        string $personaName,
        string $personaTone,
        string $personaDescription,
        string $userName,
        string $signature,
        string $intent,
        string $businessContext
    ): string {
        $fallbackSignature = $signature ?: "Best regards,\n{$userName}";

        $systemInstruction = "You are an AI assistant acting as {$userName}. "
            . "Always sign off as {$userName}. "
            . "Never disclose that you are an AI or use persona names like \"{$personaName}\" in the text. "
            . "Never use terms like 'Formal Studio', 'AI Assistant', or any persona label as a sign-off.";

        $prompt = <<<PROMPT
You are an AI email drafting assistant for {$userName}.

Draft a professional email reply.

IDENTITY RULES (OVERRIDING ALL OTHERS):
1. You are {$userName}.
2. Always use this signature: {$fallbackSignature}
3. NEVER use "{$personaName}" as a sign-off or identification.
4. NEVER disclose you are AI.

WRITING STYLE (Persona: {$personaName}):
Tone: {$personaTone}
Approach: {$personaDescription}

Requirements:
- Be concise but helpful
- Sound natural and human
- Do not overpromise or invent facts
- Output only the draft email body

CONTEXT:
Original email subject: {$subject}
From: {$fromName} ({$fromEmail})
Body: {$this->truncate($body, 3000)}
Intent: {$intent}
Business Context: {$businessContext}
PROMPT;

        $response = $this->post('gemini-2.5-pro-preview-03-25', [
            'systemInstruction' => ['parts' => [['text' => $systemInstruction]]],
            'contents' => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => ['temperature' => 0.7]
        ]);

        $text = $response['candidates'][0]['content']['parts'][0]['text'] ?? '';

        // Post-processing: purge persona name and hallucinated sign-offs
        $illegalTerms = [$personaName, 'Formal Studio', 'AI Assistant', 'Direct Execute', 'Friendly Concierge'];
        foreach ($illegalTerms as $term) {
            if (!$term) continue;
            $escaped = preg_quote($term, '/');
            $text = preg_replace(
                "/(Sincerely|Best|Regards|Kind regards|Cheers)[,]?\s*{$escaped}/i",
                $userName, $text
            );
            $text = str_ireplace($term, $userName, $text);
        }

        // Ensure signature exists
        if (!str_contains($text, substr($fallbackSignature, 0, 10))) {
            $text = trim($text) . "\n\n" . $fallbackSignature;
        }

        return trim($text);
    }

    private function truncate(string $text, int $maxChars): string {
        return mb_strlen($text) > $maxChars ? mb_substr($text, 0, $maxChars) . '...' : $text;
    }
}
