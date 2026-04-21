<?php
$admin = Auth::requireAdmin();
$orgId = $_GET['orgId'] ?? '';
$row   = Database::query('SELECT organization_id, client_id, tenant_id, redirect_uri, updated_at FROM azure_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$row) Response::error('Azure config not found for this organization', 404);
Response::success($row); // never return client_secret
