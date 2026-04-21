<?php
$user  = Auth::requireAuth();
$orgId = $user['organization_id'];

// Get all connected accounts for this org
$accounts = Database::query(
    'SELECT * FROM gmail_accounts WHERE organization_id = ?', [$orgId]
)->fetchAll();

$gcpRow = Database::query('SELECT * FROM gcp_configs WHERE organization_id = ?', [$orgId])->fetch();

$synced = 0;
foreach ($accounts as $account) {
    $accessToken = Encryption::decrypt($account['access_token']);

    // Refresh token if expired
    if ($account['expires_at'] && strtotime($account['expires_at']) < time() + 60) {
        if ($account['refresh_token']) {
            $gcpFallback = $gcpRow ?? [
                'client_id'     => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
                'client_secret' => Encryption::encrypt($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
                'redirect_uri'  => '',
            ];
            $gmail    = new GmailClient($gcpFallback);
            $newTokens = $gmail->refreshToken(Encryption::decrypt($account['refresh_token']));
            if (!empty($newTokens['access_token'])) {
                $accessToken = $newTokens['access_token'];
                $expiresAt   = date('Y-m-d H:i:s', time() + (int)($newTokens['expires_in'] ?? 3600));
                Database::query(
                    'UPDATE gmail_accounts SET access_token = ?, expires_at = ? WHERE id = ?',
                    [Encryption::encrypt($accessToken), $expiresAt, $account['id']]
                );
            }
        }
    }

    $gcpFallback = $gcpRow ?? [
        'client_id'     => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
        'client_secret' => Encryption::encrypt($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
        'redirect_uri'  => '',
    ];
    $gmail    = new GmailClient($gcpFallback);
    $messages = $gmail->listMessages($accessToken, 20);

    foreach ($messages['messages'] ?? [] as $msgRef) {
        $full    = $gmail->getMessage($accessToken, $msgRef['id']);
        $headers = [];
        foreach ($full['payload']['headers'] ?? [] as $h) {
            $headers[$h['name']] = $h['value'];
        }
        $from    = $headers['From'] ?? 'Unknown';
        $subject = $headers['Subject'] ?? '(No Subject)';
        $date    = $headers['Date'] ?? '';
        preg_match('/([^<]+)?<([^<]+@[^>]+)>/', $from, $fromParts);
        $fromName  = trim($fromParts[1] ?? '');
        $fromEmail = trim($fromParts[2] ?? $from);
        $body     = $gmail->extractBody($full['payload'] ?? []) ?: ($full['snippet'] ?? '');
        $received = $date ? date('Y-m-d H:i:s', strtotime($date)) : date('Y-m-d H:i:s');

        Database::query('
            INSERT INTO messages (id, organization_id, gmail_account_id, thread_id, subject, from_email, from_name, body_text, received_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE subject = VALUES(subject), body_text = VALUES(body_text)
        ', [$full['id'], $orgId, $account['id'], $full['threadId'] ?? '', $subject, $fromEmail, $fromName, $body, $received]);
        $synced++;
    }
}

Response::success(['synced' => $synced], "Synced {$synced} messages");
