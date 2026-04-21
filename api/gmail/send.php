<?php
$user  = Auth::requireAuth();
$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$orgId = $user['organization_id'];

$draftId = $body['draft_id'] ?? '';
if (!$draftId) Response::error('draft_id required');

$draft = Database::query('SELECT * FROM drafts WHERE id = ? AND organization_id = ?', [$draftId, $orgId])->fetch();
if (!$draft) Response::error('Draft not found', 404);

$msg = Database::query('SELECT * FROM messages WHERE id = ? AND organization_id = ?', [$draft['message_id'], $orgId])->fetch();
if (!$msg) Response::error('Original message not found', 404);

$account = Database::query('SELECT * FROM gmail_accounts WHERE organization_id = ? LIMIT 1', [$orgId])->fetch();
if (!$account) Response::error('No connected Gmail account', 404);

$gcpRow = Database::query('SELECT * FROM gcp_configs WHERE organization_id = ?', [$orgId])->fetch();
$gcpFallback = $gcpRow ?? [
    'client_id'     => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
    'client_secret' => Encryption::encrypt($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
    'redirect_uri'  => '',
];
$gmail  = new GmailClient($gcpFallback);
$accessToken = Encryption::decrypt($account['access_token']);

$result = $gmail->sendMessage($accessToken, $msg['from_email'], $msg['subject'], $draft['draft_text'], $msg['thread_id'], $msg['id']);
if (isset($result['error'])) Response::error('Gmail send failed: ' . ($result['error']['message'] ?? 'Unknown'), 500);

Database::query('UPDATE drafts SET status = "sent", sent_at = NOW() WHERE id = ?', [$draftId]);
Response::success(['message_id' => $result['id'] ?? null], 'Message sent');
