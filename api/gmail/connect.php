<?php
$user = Auth::requireAuth();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$orgId = $user['organization_id'];

// Fetch GCP config for this org
$row = Database::query('SELECT * FROM gcp_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$row) {
    // Fall back to env defaults
    $row = [
        'client_id'     => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
        'client_secret' => Encryption::encrypt($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
        'redirect_uri'  => $_ENV['GOOGLE_REDIRECT_URI'] ?? '',
    ];
}

$gmail = new GmailClient($row);
$state = base64_encode(json_encode(['orgId' => $orgId, 'userId' => $user['id']]));
$url   = $gmail->getAuthUrl($state);
Response::success(['url' => $url]);
