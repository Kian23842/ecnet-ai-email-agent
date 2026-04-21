<?php
$user = Auth::requireAuth();
$orgId = $user['organization_id'];

$cfg = Database::query('SELECT * FROM azure_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$cfg) Response::error('Azure configuration not found. Admin must set it up first.', 400);

// Generate structured state
$state = base64_encode(json_encode(['orgId' => $orgId, 'nonce' => bin2hex(random_bytes(16))]));

$client = new OutlookClient($cfg);
Response::success(['url' => $client->getAuthUrl($state)]);
