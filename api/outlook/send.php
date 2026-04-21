<?php
$user    = Auth::requireAuth();
$orgId   = $user['organization_id'];
$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$draftId = $body['draft_id'] ?? '';

if (!$draftId) Response::error('draft_id required');

$draft = Database::query('SELECT * FROM drafts WHERE id = ? AND organization_id = ?', [$draftId, $orgId])->fetch();
if (!$draft) Response::error('Draft not found', 404);
if ($draft['status'] === 'sent') Response::error('Draft already sent', 400);

$msg = Database::query('SELECT * FROM messages WHERE id = ? AND organization_id = ?', [$draft['message_id'], $orgId])->fetch();
if (!$msg) Response::error('Original message not found');

if (!$msg['outlook_account_id']) Response::error('Message is not tied to an Outlook account', 400);

$acc = Database::query('SELECT * FROM outlook_accounts WHERE id = ?', [$msg['outlook_account_id']])->fetch();
if (!$acc) Response::error('Outlook account not found');

$cfg = Database::query('SELECT * FROM azure_configs WHERE organization_id = ?', [$orgId])->fetch();
$client = new OutlookClient($cfg);
$accessToken = Encryption::decrypt($acc['access_token']);

// Auto-refresh token if near expiry
if (strtotime($acc['expires_at']) < time() + 300 && $acc['refresh_token']) {
    $newTokens = $client->refreshToken(Encryption::decrypt($acc['refresh_token']));
    if (!isset($newTokens['error'])) {
        $accessToken = $newTokens['access_token'];
        $rtc = isset($newTokens['refresh_token']) ? Encryption::encrypt($newTokens['refresh_token']) : $acc['refresh_token'];
        Database::query('UPDATE outlook_accounts SET access_token=?, refresh_token=?, expires_at=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id=?', 
            [Encryption::encrypt($accessToken), $rtc, $newTokens['expires_in'] ?? 3600, $acc['id']]);
    }
}

$res = $client->sendMessage(
    $accessToken,
    $msg['from_email'], // Reply to
    $msg['subject'] ?? 'Re: your email',
    $draft['draft_text'] ?? '',
    $msg['id'] // Assuming passing messageId as context or just a simple reply.
);
if (isset($res['error'])) Response::error('Failed to send email via Outlook: ' . json_encode($res['error']));

Database::query('UPDATE drafts SET status = "sent", sent_at = NOW() WHERE id = ?', [$draftId]);
Response::success(null, 'Message sent via Outlook');
