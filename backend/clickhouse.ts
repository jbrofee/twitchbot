import { createClient, ClickHouseClient } from "@clickhouse/client";

let clickhouseClient: ClickHouseClient | null = null;

export function initializeClickHouse(clickhouseUri: string) {
    if (!clickhouseClient) {
        clickhouseClient = createClient({
            url: clickhouseUri
        });
    }
    return clickhouseClient;
}

export default async function clickhouseQuery() {
    if (!clickhouseClient) {
        throw new Error("ClickHouse client not initialized. Call initializeClickHouse first.");
    }

    const result = await clickhouseClient.query({
        query: `SELECT *
                FROM my_first_table`,
        format: 'JSON'
    });

    const data = await result.json();
    const rows = data.data;

    console.log(`Found ${rows.length} rows:`);

    rows.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
            user_id: row.user_id,
            message: row.message,
            timestamp: row.timestamp,
            metric: row.metric
        });
    })
}