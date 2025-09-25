import { createClient, ClickHouseClient } from "@clickhouse/client";

export var clickhouseClient: ClickHouseClient | null = null;

export function initializeClickHouse(clickhouseUri: string) {
    if (!clickhouseClient) {
        clickhouseClient = createClient({
            url: clickhouseUri
        });
    }
    return clickhouseClient;
}