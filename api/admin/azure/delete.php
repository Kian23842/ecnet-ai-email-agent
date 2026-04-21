<?php
$admin = Auth::requireAdmin();
$orgId = $_GET['orgId'] ?? '';
Database::query('DELETE FROM azure_configs WHERE organization_id = ?', [$orgId]);
Response::success(null, 'Azure configuration deleted');
