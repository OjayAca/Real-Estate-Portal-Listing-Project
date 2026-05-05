<?php
$lines = file(__DIR__ . '/storage/logs/laravel.log');
$count = 0;
foreach (array_reverse($lines) as $line) {
    if (strpos($line, 'local.ERROR:') !== false) {
        echo $line;
        $count++;
        if ($count > 10) break;
    }
}
