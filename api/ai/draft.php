<?php
$user   = Auth::requireAuth();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$orgId  = $user['organization_id'];
$msgId  = $body['message_id'] ?? '';
$personaId = $body['persona_id'] ?? 'formal';

if (!$msgId) Response::error('message_id required');

$msg = Database::query('SELECT * FROM messages WHERE id = ? AND organization_id = ?', [$msgId, $orgId])->fetch();
if (!$msg) Response::error('Message not found', 404);

$classification = Database::query(
    'SELECT * FROM classifications WHERE message_id = ? AND organization_id = ?', [$msgId, $orgId]
)->fetch();

// Built-in personas (if no DB persona found)
$builtInPersonas = [
    'formal'    => ['name' => 'Formal Professional', 'tone' => 'Professional', 'description' => 'Polished, authoritative, and corporate.'],
    'support'   => ['name' => 'Friendly Support', 'tone' => 'Empathetic', 'description' => 'Helpful, warm, and solution-oriented.'],
    'closer'    => ['name' => 'Sales Closer', 'tone' => 'Persuasive', 'description' => 'Action-oriented, value-driven, and engaging.'],
    'tech'      => ['name' => 'Technical Support', 'tone' => 'Analytical', 'description' => 'Precise, detailed, and clear instructions.'],
    'executive' => ['name' => 'Executive Assistant', 'tone' => 'Efficient', 'description' => 'Concise, organized, and proactive.'],
];

$persona = $builtInPersonas[$personaId] ?? $builtInPersonas['formal'];

$gemini = new GeminiClient();
$draftText = $gemini->generateDraft(
    $msg['subject'] ?? '',
    $msg['body_text'] ?? '',
    $msg['from_name'] ?? '',
    $msg['from_email'] ?? '',
    $persona['name'],
    $persona['tone'],
    $persona['description'],
    $user['display_name'] ?? $user['email'],
    $user['signature'] ?? '',
    $classification['intent'] ?? 'Respond professionally',
    $user['business_context'] ?? ''
);

$draftId = Database::uuid();
Database::query('
    INSERT INTO drafts (id, message_id, organization_id, persona_id, draft_text, status)
    VALUES (?, ?, ?, ?, ?, "draft")
    ON DUPLICATE KEY UPDATE draft_text = VALUES(draft_text), persona_id = VALUES(persona_id), status = "draft"
', [$draftId, $msgId, $orgId, $personaId, $draftText]);

Response::success([
    'id'        => $draftId,
    'message_id'=> $msgId,
    'persona_id'=> $personaId,
    'draft_text'=> $draftText,
    'status'    => 'draft',
]);
