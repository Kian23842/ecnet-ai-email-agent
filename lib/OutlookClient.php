<?php
declare(strict_types=1);

class OutlookClient {
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;
    private string $tenantId;

    public function __construct(array $azureConfig) {
        $this->clientId     = $azureConfig['client_id'];
        $this->clientSecret = Encryption::decrypt($azureConfig['client_secret']);
        $this->tenantId     = $azureConfig['tenant_id'] ?? 'common';
        $this->redirectUri  = $azureConfig['redirect_uri'] ?? ($_ENV['APP_URL'] . '/api/outlook/callback');
    }

    public function getAuthUrl(string $state): string {
        $params = http_build_query([
            'client_id'     => $this->clientId,
            'redirect_uri'  => $this->redirectUri,
            'response_type' => 'code',
            'scope'         => 'offline_access User.Read Mail.Read Mail.Send',
            'state'         => $state,
            'prompt'        => 'select_account',
        ]);
        return "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/authorize?{$params}";
    }

    public function exchangeCode(string $code): array {
        return $this->curlPostForm("https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token", [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code'          => $code,
            'redirect_uri'  => $this->redirectUri,
            'grant_type'    => 'authorization_code',
        ]);
    }

    public function refreshToken(string $refreshToken): array {
        return $this->curlPostForm("https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token", [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type'    => 'refresh_token',
        ]);
    }

    public function getUserInfo(string $accessToken): array {
        return $this->curlGet('https://graph.microsoft.com/v1.0/me', $accessToken);
    }

    public function listMessages(string $accessToken, int $top = 10): array {
        $params = http_build_query(['$top' => $top, '$orderby' => 'receivedDateTime desc']);
        return $this->curlGet("https://graph.microsoft.com/v1.0/me/messages?{$params}", $accessToken);
    }

    public function getMessage(string $accessToken, string $messageId): array {
        return $this->curlGet("https://graph.microsoft.com/v1.0/me/messages/{$messageId}", $accessToken);
    }

    public function sendMessage(string $accessToken, string $to, string $subject, string $body, string $replyToMsgId = ''): array {
        $payload = [
            'message' => [
                'subject' => "Re: " . $subject,
                'body' => [
                    'contentType' => 'Text',
                    'content' => $body
                ],
                'toRecipients' => [
                    [
                        'emailAddress' => [
                            'address' => $to
                        ]
                    ]
                ]
            ]
        ];

        // If it's a reply, sending might be slightly different in Graph, but we can just use the standard sendMail endpoint.
        // For actual threaded replies, you'd usually use the /createReply endpoint then /send, 
        // but for simplicity we will just send anew. 

        return $this->curlPostJson("https://graph.microsoft.com/v1.0/me/sendMail", $payload, $accessToken);
    }

    public function extractBody(array $payload): string {
        $content = $payload['body']['content'] ?? '';
        return strip_tags($content); // very basic, but mostly okay for Graph API text outputs
    }

    private function curlGet(string $url, string $accessToken): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ["Authorization: Bearer {$accessToken}", "Accept: application/json"],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }

    private function curlPostForm(string $url, array $data): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($data),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }
    
    private function curlPostJson(string $url, array $data, string $accessToken): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_HTTPHEADER     => [
                "Authorization: Bearer {$accessToken}",
                "Content-Type: application/json"
            ],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }
}
