<?php
$user   = Auth::requireAuth();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$orgId  = $user['organization_id'];
$msgId  = $body['message_id'] ?? '';
if (!$msgId) Response::error('message_id required');

$msg = Database::query('SELECT * FROM messages WHERE id = ? AND organization_id = ?', [$msgId, $orgId])->fetch();
if (!$msg) Response::error('Message not found', 404);

$gemini = new GeminiClient();
$result = $gemini->classifyEmail($msg['subject'] ?? '', $msg['body_text'] ?? '');

Database::query('
    INSERT INTO classifications (message_id, organization_id, category, urgency, sentiment, intent, summary,
        sender_name, sender_email, company_name, requested_action, requires_human_review, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        category=VALUES(category), urgency=VALUES(urgency), sentiment=VALUES(sentiment),
        intent=VALUES(intent), summary=VALUES(summary), sender_name=VALUES(sender_name),
        confidence=VALUES(confidence), classified_at=NOW()
', [
    $msgId, $orgId,
    $result['category'] ?? 'general',
    $result['urgency'] ?? 'low',
    $result['sentiment'] ?? 'neutral',
    $result['intent'] ?? '',
    $result['summary'] ?? '',
    $result['sender_name'] ?? null,
    $result['sender_email'] ?? null,
    $result['company_name'] ?? null,
    $result['requested_action'] ?? null,
    (int)($result['requires_human_review'] ?? 0),
    $result['confidence'] ?? null,
]);

Response::success(array_merge($result, ['message_id' => $msgId, 'organization_id' => $orgId]));
