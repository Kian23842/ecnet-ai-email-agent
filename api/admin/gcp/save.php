<?php
$admin = Auth::requireAdmin();
$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$orgId        = trim($body['organization_id'] ?? '');
$clientId     = trim($body['client_id'] ?? '');
$clientSecret = trim($body['client_secret'] ?? '');
$redirectUri  = trim($body['redirect_uri'] ?? ($_ENV['APP_URL'] . '/api/gmail/callback'));
if (!$orgId || !$clientId || !$clientSecret) Response::error('organization_id, client_id, and client_secret are required');
$org = Database::query('SELECT id FROM organizations WHERE id = ?', [$orgId])->fetch();
if (!$org) Response::error("Organization '{$orgId}' not found. Create it first.", 400);
Database::query('
    INSERT INTO gcp_configs (organization_id, client_id, client_secret, redirect_uri)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE client_id = VALUES(client_id), client_secret = VALUES(client_secret), redirect_uri = VALUES(redirect_uri)
', [$orgId, $clientId, Encryption::encrypt($clientSecret), $redirectUri]);
Response::success(null, 'GCP configuration saved');
