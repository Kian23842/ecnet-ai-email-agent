<?php
$user = Auth::requireAuth();
$orgId = $user['organization_id'];

$cfg = Database::query('SELECT * FROM azure_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$cfg) Response::error('Azure configuration not found', 400);

$accounts = Database::query('SELECT * FROM outlook_accounts WHERE organization_id = ?', [$orgId])->fetchAll();
if (!$accounts) Response::error('No Outlook accounts connected', 400);

$client = new OutlookClient($cfg);
$db = Database::getInstance();
$synced = 0;

foreach ($accounts as $acc) {
    $accessToken = Encryption::decrypt($acc['access_token']);
    
    // Check expiry
    if (strtotime($acc['expires_at']) < time() + 300) {
        if (!$acc['refresh_token']) continue; // Can't refresh
        $newTokens = $client->refreshToken(Encryption::decrypt($acc['refresh_token']));
        if (isset($newTokens['error'])) continue;
        
        $accessToken = $newTokens['access_token'];
        $refreshTokenUpdate = isset($newTokens['refresh_token']) ? Encryption::encrypt($newTokens['refresh_token']) : $acc['refresh_token'];
        
        Database::query('UPDATE outlook_accounts SET access_token=?, refresh_token=?, expires_at=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id=?', 
            [Encryption::encrypt($accessToken), $refreshTokenUpdate, $newTokens['expires_in'] ?? 3600, $acc['id']]);
    }
    
    $messages = $client->listMessages($accessToken, 20); // Top 20
    if (!isset($messages['value'])) continue;
    
    foreach ($messages['value'] as $msgInfo) {
        $msgId = $msgInfo['id'];
        
        // Skip if already exists
        $exists = Database::query('SELECT id FROM messages WHERE id=? AND organization_id=?', [$msgId, $orgId])->fetch();
        if ($exists) continue;
        
        $fullMsg = $client->getMessage($accessToken, $msgId);
        if (isset($fullMsg['error'])) continue;
        
        $subject = $fullMsg['subject'] ?? '';
        $fromEmail = $fullMsg['from']['emailAddress']['address'] ?? '';
        $fromName = $fullMsg['from']['emailAddress']['name'] ?? '';
        $bodyText = $client->extractBody($fullMsg);
        
        $receivedAt = date('Y-m-d H:i:s', strtotime($fullMsg['receivedDateTime']));
        // In Graph, conversationId is equivalent to threadId
        $threadId = $fullMsg['conversationId'] ?? $msgId;
        
        Database::query('
            INSERT INTO messages (id, organization_id, outlook_account_id, thread_id, subject, from_email, from_name, body_text, received_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ', [$msgId, $orgId, $acc['id'], $threadId, $subject, $fromEmail, $fromName, $bodyText, $receivedAt]);
        $synced++;
    }
}

Response::success(['synced' => $synced], "Synced $synced messages");
