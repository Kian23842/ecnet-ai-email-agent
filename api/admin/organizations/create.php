<?php
$admin = Auth::requireAdmin();
$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$id    = trim($body['id'] ?? '');
$name  = trim($body['name'] ?? '');
if (!$id || !$name) Response::error('id and name are required');
if (preg_match('/[^a-z0-9_\-]/', $id)) Response::error('Organization ID must be lowercase alphanumeric with underscores/hyphens only');
$existing = Database::query('SELECT id FROM organizations WHERE id = ?', [$id])->fetch();
if ($existing) Response::error('Organization already exists', 409);
Database::query('INSERT INTO organizations (id, name) VALUES (?, ?)', [$id, $name]);
Response::success(['id' => $id, 'name' => $name], 'Organization created', 201);
