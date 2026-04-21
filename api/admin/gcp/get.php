<?php
$admin = Auth::requireAdmin();
$orgId = $_GET['orgId'] ?? '';
$row   = Database::query('SELECT organization_id, client_id, redirect_uri, updated_at FROM gcp_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$row) Response::error('GCP config not found for this organization', 404);
Response::success($row); // never return client_secret
