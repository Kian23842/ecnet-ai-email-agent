<?php
declare(strict_types=1);

class GmailClient {
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;

    public function __construct(array $gcpConfig) {
        $this->clientId     = $gcpConfig['client_id'];
        $this->clientSecret = Encryption::decrypt($gcpConfig['client_secret']);
        $this->redirectUri  = $gcpConfig['redirect_uri'] ?? ($_ENV['GOOGLE_REDIRECT_URI'] ?? '');
    }

    public function getAuthUrl(string $state): string {
        $params = http_build_query([
            'client_id'     => $this->clientId,
            'redirect_uri'  => $this->redirectUri,
            'response_type' => 'code',
            'scope'         => 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
            'access_type'   => 'offline',
            'prompt'        => 'consent',
            'state'         => $state,
        ]);
        return "https://accounts.google.com/o/oauth2/v2/auth?{$params}";
    }

    public function exchangeCode(string $code): array {
        return $this->curlPost('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri'  => $this->redirectUri,
            'grant_type'    => 'authorization_code',
        ]);
    }

    public function refreshToken(string $refreshToken): array {
        return $this->curlPost('https://oauth2.googleapis.com/token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type'    => 'refresh_token',
        ]);
    }

    public function getUserInfo(string $accessToken): array {
        return $this->curlGet('https://www.googleapis.com/oauth2/v2/userinfo', $accessToken);
    }

    public function listMessages(string $accessToken, int $maxResults = 10, string $query = 'label:INBOX'): array {
        $params = http_build_query(['maxResults' => $maxResults, 'q' => $query]);
        return $this->curlGet("https://gmail.googleapis.com/gmail/v1/users/me/messages?{$params}", $accessToken);
    }

    public function getMessage(string $accessToken, string $messageId): array {
        return $this->curlGet(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/{$messageId}?format=full",
            $accessToken
        );
    }

    public function sendMessage(string $accessToken, string $to, string $subject, string $body, string $threadId, string $inReplyTo): array {
        $rawMessage = implode("\r\n", [
            "To: {$to}",
            "Subject: Re: {$subject}",
            "In-Reply-To: {$inReplyTo}",
            "References: {$inReplyTo}",
            "Content-Type: text/plain; charset=utf-8",
            "MIME-Version: 1.0",
            "",
            $body
        ]);
        $encoded = rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '=');
        return $this->curlPost(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            ['raw' => $encoded, 'threadId' => $threadId],
            $accessToken
        );
    }

    public function extractBody(array $payload): string {
        if (isset($payload['mimeType']) && $payload['mimeType'] === 'text/plain'
            && !empty($payload['body']['data'])) {
            return base64_decode(strtr($payload['body']['data'], '-_', '+/'));
        }
        foreach ($payload['parts'] ?? [] as $part) {
            $text = $this->extractBody($part);
            if ($text) return $text;
        }
        if (!empty($payload['body']['data'])) {
            return base64_decode(strtr($payload['body']['data'], '-_', '+/'));
        }
        return '';
    }

    private function curlGet(string $url, string $accessToken): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ["Authorization: Bearer {$accessToken}"],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }

    private function curlPost(string $url, array $data, ?string $accessToken = null): array {
        $headers = ['Content-Type: application/json'];
        if ($accessToken) $headers[] = "Authorization: Bearer {$accessToken}";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }
}
