<?php

$host = 'aws-0-us-east-1.pooler.supabase.com';
$port = '5432';
$db   = 'postgres';
$user = 'postgres.pjuxfiycxkwxiteoqogo';
$pass = 'oAPdVHDcTjG7dIZR';

echo "Testing connection to $host...\n";

// Test 1: Standard DSN
try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    echo "Attempting PDO connection with DSN: $dsn\n";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "SUCCESS: Connected successfully via standard DSN!\n";
} catch (PDOException $e) {
    echo "FAILURE: " . $e->getMessage() . "\n";
}

echo "\n--- Attempting with Port 6543 ---\n";
try {
    $dsn = "pgsql:host=$host;port=6543;dbname=$db";
    echo "Attempting PDO connection with DSN: $dsn\n";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "SUCCESS: Connected successfully via Port 6543!\n";
} catch (PDOException $e) {
    echo "FAILURE: " . $e->getMessage() . "\n";
}
