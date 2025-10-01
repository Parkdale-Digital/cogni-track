"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const FIXTURE_DIR = node_path_1.default.resolve(__dirname, '../audit/admin-api-fixtures');
const OUTPUT_DIR = node_path_1.default.resolve(__dirname, '../audit/spike-results');
async function loadJson(filename) {
    const fullPath = node_path_1.default.join(FIXTURE_DIR, filename);
    const payload = await (0, promises_1.readFile)(fullPath, 'utf8');
    return JSON.parse(payload);
}
function safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function resolveTimestamp(record, fallbackIso) {
    if ('start_time_iso' in record && record.start_time_iso) {
        return new Date(record.start_time_iso).toISOString();
    }
    if ('start_time' in record && typeof record.start_time === 'number') {
        return new Date(record.start_time * 1000).toISOString();
    }
    if ('timestamp' in record && typeof record.timestamp === 'number') {
        return new Date(record.timestamp * 1000).toISOString();
    }
    return fallbackIso ?? new Date().toISOString();
}
function extractModel(item) {
    if (item.model)
        return item.model;
    if (item.name)
        return item.name;
    return 'unknown';
}
function normalizeAdminLineItems(items, timestampIso, source) {
    if (!items?.length)
        return [];
    return items.map((item) => {
        const tokensIn = safeNumber(item.input_tokens ?? item.prompt_tokens ?? item.usage?.prompt_tokens);
        const tokensOut = safeNumber(item.output_tokens ?? item.completion_tokens ?? item.usage?.completion_tokens);
        const cost = safeNumber(item.cost ?? item.amount ?? item.usage?.total_cost);
        return {
            bucketTimestamp: timestampIso,
            model: extractModel(item),
            tokensIn,
            tokensOut,
            costEstimate: Number(cost.toFixed(6)),
            source,
        };
    });
}
function dedupeUsageEvents(events) {
    const map = new Map();
    for (const event of events) {
        const key = `${event.bucketTimestamp}|${event.model}`;
        if (!map.has(key)) {
            map.set(key, {
                bucketTimestamp: event.bucketTimestamp,
                model: event.model,
                tokensIn: event.tokensIn,
                tokensOut: event.tokensOut,
                costEstimate: event.costEstimate,
                sources: [event.source],
            });
            continue;
        }
        const existing = map.get(key);
        const sources = existing.sources.includes(event.source)
            ? existing.sources
            : [...existing.sources, event.source];
        map.set(key, {
            bucketTimestamp: existing.bucketTimestamp,
            model: existing.model,
            tokensIn: Math.max(existing.tokensIn, event.tokensIn),
            tokensOut: Math.max(existing.tokensOut, event.tokensOut),
            costEstimate: Math.max(existing.costEstimate, event.costEstimate),
            sources,
        });
    }
    return Array.from(map.values());
}
function summarizeUsage(response, deduped, rawCount) {
    const tokensIn = deduped.reduce((sum, event) => sum + event.tokensIn, 0);
    const tokensOut = deduped.reduce((sum, event) => sum + event.tokensOut, 0);
    const costEstimate = deduped.reduce((sum, event) => sum + event.costEstimate, 0);
    return {
        totalBuckets: response.data?.length ?? 0,
        totalRawEvents: rawCount,
        totalDedupedEvents: deduped.length,
        tokensIn,
        tokensOut,
        costEstimate: Number(costEstimate.toFixed(6)),
        cursor: {
            endpoint: 'usage/completions',
            nextPage: response.next_page ?? null,
            lastSyncedAt: new Date().toISOString(),
            hasMore: Boolean(response.has_more),
        },
    };
}
function summarizeEndpoint(endpoint, fixture, pages, metrics, breakdowns = []) {
    const totals = Object.fromEntries(metrics.map((metric) => [metric.key, 0]));
    const breakdownTotals = {};
    let totalResults = 0;
    let totalBuckets = 0;
    for (const page of pages) {
        totalBuckets += page.data?.length ?? 0;
        for (const bucket of page.data ?? []) {
            for (const result of bucket.results ?? []) {
                totalResults += 1;
                for (const metric of metrics) {
                    const value = Number(metric.selector(result) ?? 0);
                    if (Number.isFinite(value)) {
                        totals[metric.key] += value;
                    }
                }
                for (const breakdown of breakdowns) {
                    const dimensionValue = breakdown.groupBy(result) ?? 'unspecified';
                    const metricValue = Number(breakdown.metric(result) ?? 0);
                    if (!Number.isFinite(metricValue))
                        continue;
                    if (!breakdownTotals[breakdown.name]) {
                        breakdownTotals[breakdown.name] = {};
                    }
                    breakdownTotals[breakdown.name][dimensionValue] =
                        (breakdownTotals[breakdown.name][dimensionValue] ?? 0) + metricValue;
                }
            }
        }
    }
    const lastPage = pages[pages.length - 1] ?? {};
    return {
        endpoint,
        fixture,
        totalBuckets,
        totalResults,
        metrics: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number(value.toFixed(6))])),
        breakdowns: Object.keys(breakdownTotals).length ? breakdownTotals : undefined,
        hasMore: Boolean(lastPage.has_more),
        nextPage: lastPage.next_page ?? null,
        pagesProcessed: pages.length,
    };
}
function inspectRelationships(input) {
    const projectIds = new Set(input.projects.map((p) => p.id));
    const serviceAccountProjects = new Set(input.serviceAccounts.map((s) => s.project_id));
    const memberProjects = new Set(input.members.map((m) => m.project_id));
    const serviceAccountIds = new Set(input.serviceAccounts.map((s) => s.id));
    const keyAccountIds = new Set(input.keys.map((k) => k.service_account_id));
    const certificateIds = new Set(input.certificates.map((c) => c.id));
    const eventCertificateIds = new Set(input.certificateEvents.map((e) => e.certificate_id));
    const missingProjectIds = Array.from(new Set([...serviceAccountProjects, ...memberProjects])).filter((id) => !projectIds.has(id));
    const orphanServiceAccountIds = input.serviceAccounts
        .filter((svc) => !projectIds.has(svc.project_id))
        .map((svc) => svc.id);
    const missingServiceAccountIds = Array.from(keyAccountIds).filter((id) => !serviceAccountIds.has(id));
    const orphanKeyIds = input.keys.filter((key) => !serviceAccountIds.has(key.service_account_id)).map((key) => key.id);
    const missingCertificateIds = Array.from(eventCertificateIds).filter((id) => !certificateIds.has(id));
    return {
        missingProjectIds,
        orphanServiceAccountIds,
        missingServiceAccountIds,
        orphanKeyIds,
        missingCertificateIds,
    };
}
async function runSpike() {
    const usage = await loadJson('usage_completions_fixture.json');
    const usageEvents = [];
    const pendingCompletionProjects = [];
    const pendingCompletionServiceAccounts = [];
    const pendingCompletionKeys = [];
    const pendingCompletionCertificates = [];
    const unknownProjects = new Set();
    const unknownServiceAccounts = new Set();
    const unknownServiceAccountKeys = new Set();
    const unknownCertificates = new Set();
    for (const bucket of usage.data ?? []) {
        const timestamp = resolveTimestamp(bucket);
        for (const result of bucket.results ?? []) {
            const projectId = result?.metadata?.project_id;
            if (projectId) {
                pendingCompletionProjects.push(projectId);
            }
            const serviceAccountId = result?.metadata?.service_account_id;
            if (serviceAccountId) {
                pendingCompletionServiceAccounts.push(serviceAccountId);
            }
            const keyId = result?.metadata?.service_account_key_id;
            if (keyId) {
                pendingCompletionKeys.push(keyId);
            }
            const certificateId = result?.metadata?.certificate_id;
            if (certificateId) {
                pendingCompletionCertificates.push(certificateId);
            }
        }
        usageEvents.push(...normalizeAdminLineItems(bucket.results, timestamp, 'bucket:data'));
    }
    for (const daily of usage.daily_costs ?? []) {
        const timestamp = resolveTimestamp({ timestamp: daily.timestamp }, '1970-01-01T00:00:00.000Z');
        usageEvents.push(...normalizeAdminLineItems(daily.line_items, timestamp, 'daily_costs'));
    }
    const dedupedUsage = dedupeUsageEvents(usageEvents);
    const usageSummary = summarizeUsage(usage, dedupedUsage, usageEvents.length);
    const [projects, members, serviceAccounts, keys, certificates, certificateEvents] = await Promise.all([
        loadJson('projects_list_fixture.json').then((resp) => resp.data ?? []),
        loadJson('project_members_fixture.json').then((resp) => resp.data ?? []),
        loadJson('service_accounts_fixture.json').then((resp) => resp.data ?? []),
        loadJson('service_account_keys_fixture.json').then((resp) => resp.data ?? []),
        loadJson('certificates_fixture.json').then((resp) => resp.data ?? []),
        loadJson('certificate_events_fixture.json').then((resp) => resp.data ?? []),
    ]);
    const knownProjectIds = new Set(projects.map((p) => p.id));
    const knownServiceAccountIds = new Set(serviceAccounts.map((s) => s.id));
    const knownServiceAccountKeyIds = new Set(keys.map((k) => k.id));
    const knownCertificateIds = new Set(certificates.map((c) => c.id));
    for (const projectId of pendingCompletionProjects) {
        if (!knownProjectIds.has(projectId)) {
            unknownProjects.add(`usage/completions:${projectId}`);
        }
    }
    for (const serviceAccountId of pendingCompletionServiceAccounts) {
        if (!knownServiceAccountIds.has(serviceAccountId)) {
            unknownServiceAccounts.add(`usage/completions:${serviceAccountId}`);
        }
    }
    for (const keyId of pendingCompletionKeys) {
        if (!knownServiceAccountKeyIds.has(keyId)) {
            unknownServiceAccountKeys.add(`usage/completions:${keyId}`);
        }
    }
    for (const certificateId of pendingCompletionCertificates) {
        if (!knownCertificateIds.has(certificateId)) {
            unknownCertificates.add(`usage/completions:${certificateId}`);
        }
    }
    const additionalPageMap = {
        'usage/embeddings': ['usage_embeddings_fixture.json', 'usage_embeddings_fixture_page2.json'],
        'usage/moderations': ['usage_moderations_fixture.json', 'usage_moderations_fixture_page2.json'],
        'usage/images': ['usage_images_fixture.json', 'usage_images_fixture_page2.json'],
        'usage/audio_speeches': ['usage_audio_speeches_fixture.json', 'usage_audio_speeches_fixture_page2.json'],
        'usage/audio_transcriptions': ['usage_audio_transcriptions_fixture.json', 'usage_audio_transcriptions_fixture_page2.json'],
        'usage/vector_stores': ['usage_vector_stores_fixture.json', 'usage_vector_stores_fixture_page2.json'],
        'usage/code_interpreter_sessions': ['usage_code_interpreter_fixture.json', 'usage_code_interpreter_fixture_page2.json'],
        'costs': ['costs_fixture.json', 'costs_fixture_page2.json'],
    };
    const loadPages = async (names) => {
        const pages = [];
        for (const name of names) {
            pages.push(await loadJson(name));
        }
        return pages;
    };
    const additionalSummaries = await Promise.all(Object.entries(additionalPageMap).map(async ([endpoint, fixtures]) => {
        const [primary] = fixtures;
        const pages = await loadPages(fixtures);
        const summary = summarizeEndpoint(endpoint, primary, pages, endpoint === 'usage/images'
            ? [
                { key: 'images', selector: (result) => Number(result.images ?? 0) },
                { key: 'num_model_requests', selector: (result) => Number(result.num_model_requests ?? 0) },
            ]
            : endpoint === 'usage/audio_speeches'
                ? [
                    { key: 'characters', selector: (result) => Number(result.characters ?? 0) },
                    { key: 'num_model_requests', selector: (result) => Number(result.num_model_requests ?? 0) },
                ]
                : endpoint === 'usage/audio_transcriptions'
                    ? [
                        { key: 'seconds', selector: (result) => Number(result.seconds ?? 0) },
                        { key: 'num_model_requests', selector: (result) => Number(result.num_model_requests ?? 0) },
                    ]
                    : endpoint === 'usage/vector_stores'
                        ? [
                            { key: 'usage_bytes', selector: (result) => Number(result.usage_bytes ?? 0) },
                        ]
                        : endpoint === 'usage/code_interpreter_sessions'
                            ? [
                                { key: 'num_sessions', selector: (result) => Number(result.num_sessions ?? 0) },
                            ]
                            : endpoint === 'costs'
                                ? [
                                    { key: 'amount_value', selector: (result) => Number(result.amount?.value ?? 0) },
                                ]
                                : [
                                    { key: 'input_tokens', selector: (result) => Number(result.input_tokens ?? 0) },
                                    { key: 'num_model_requests', selector: (result) => Number(result.num_model_requests ?? 0) },
                                ], endpoint === 'usage/images'
            ? [
                {
                    name: 'bySize',
                    groupBy: (result) => result.size,
                    metric: (result) => Number(result.images ?? 0),
                },
                {
                    name: 'bySource',
                    groupBy: (result) => result.source,
                    metric: (result) => Number(result.images ?? 0),
                },
            ]
            : endpoint === 'costs'
                ? [
                    {
                        name: 'byLineItem',
                        groupBy: (result) => result.line_item,
                        metric: (result) => Number(result.amount?.value ?? 0),
                    },
                    {
                        name: 'byCurrency',
                        groupBy: (result) => result.amount?.currency,
                        metric: (result) => Number(result.amount?.value ?? 0),
                    },
                ]
                : []);
        for (const page of pages) {
            for (const bucket of page.data ?? []) {
                for (const result of bucket.results ?? []) {
                    const candidate = (field) => result?.[field] ?? result?.metadata?.[field] ?? null;
                    const projectId = candidate('project_id');
                    if (projectId && !knownProjectIds.has(projectId)) {
                        unknownProjects.add(`${endpoint}:${projectId}`);
                    }
                    const serviceAccountId = candidate('service_account_id');
                    if (serviceAccountId && !knownServiceAccountIds.has(serviceAccountId)) {
                        unknownServiceAccounts.add(`${endpoint}:${serviceAccountId}`);
                    }
                    const keyId = candidate('service_account_key_id');
                    if (keyId && !knownServiceAccountKeyIds.has(keyId)) {
                        unknownServiceAccountKeys.add(`${endpoint}:${keyId}`);
                    }
                    const certificateId = candidate('certificate_id');
                    if (certificateId && !knownCertificateIds.has(certificateId)) {
                        unknownCertificates.add(`${endpoint}:${certificateId}`);
                    }
                }
            }
        }
        return summary;
    }));
    const relationships = inspectRelationships({
        projects,
        members,
        serviceAccounts,
        keys,
        certificates,
        certificateEvents,
    });
    await (0, promises_1.mkdir)(OUTPUT_DIR, { recursive: true });
    const reportPath = node_path_1.default.join(OUTPUT_DIR, 'admin_ingestion_spike.json');
    const report = {
        metadata: {
            generatedAt: new Date().toISOString(),
            fixtures: {
                usage: 'usage_completions_fixture.json',
                usageVariants: {
                    embeddings: 'usage_embeddings_fixture.json',
                    moderations: 'usage_moderations_fixture.json',
                    images: 'usage_images_fixture.json',
                    audioSpeeches: 'usage_audio_speeches_fixture.json',
                    audioTranscriptions: 'usage_audio_transcriptions_fixture.json',
                    vectorStores: 'usage_vector_stores_fixture.json',
                    codeInterpreterSessions: 'usage_code_interpreter_fixture.json',
                    costs: 'costs_fixture.json',
                },
                projects: 'projects_list_fixture.json',
                members: 'project_members_fixture.json',
                serviceAccounts: 'service_accounts_fixture.json',
                serviceAccountKeys: 'service_account_keys_fixture.json',
                certificates: 'certificates_fixture.json',
                certificateEvents: 'certificate_events_fixture.json',
            },
        },
        usageSummary,
        dedupedUsage,
        additionalSummaries,
        relationships,
        foreignKeyIssues: {
            unknownProjects: Array.from(unknownProjects),
            unknownServiceAccounts: Array.from(unknownServiceAccounts),
            unknownServiceAccountKeys: Array.from(unknownServiceAccountKeys),
            unknownCertificates: Array.from(unknownCertificates),
        },
    };
    await (0, promises_1.writeFile)(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return {
        reportPath,
        usageSummary,
        additionalSummaries,
        relationships,
        unknownProjects: Array.from(unknownProjects),
        unknownServiceAccounts: Array.from(unknownServiceAccounts),
        unknownServiceAccountKeys: Array.from(unknownServiceAccountKeys),
        unknownCertificates: Array.from(unknownCertificates),
    };
}
async function main() {
    const { reportPath, usageSummary, additionalSummaries, relationships, unknownProjects, unknownServiceAccounts, unknownServiceAccountKeys, unknownCertificates, } = await runSpike();
    const issues = [];
    if (usageSummary.cursor.hasMore) {
        issues.push('usage/completions fixture still indicates additional pages; confirm pagination.');
    }
    for (const summary of additionalSummaries) {
        if (summary.hasMore) {
            issues.push(`${summary.endpoint} fixture indicates additional pages; confirm pagination.`);
        }
    }
    if (relationships.missingProjectIds.length) {
        issues.push(`Projects referenced by fixtures missing definitions: ${relationships.missingProjectIds.join(', ')}`);
    }
    if (relationships.missingServiceAccountIds.length) {
        issues.push(`Service accounts referenced by keys missing definitions: ${relationships.missingServiceAccountIds.join(', ')}`);
    }
    if (relationships.missingCertificateIds.length) {
        issues.push(`Certificates referenced by events missing definitions: ${relationships.missingCertificateIds.join(', ')}`);
    }
    if (unknownProjects.length) {
        issues.push(`Unknown project references detected: ${unknownProjects.join(', ')}`);
    }
    if (unknownServiceAccounts.length) {
        issues.push(`Unknown service accounts detected: ${unknownServiceAccounts.join(', ')}`);
    }
    if (unknownServiceAccountKeys.length) {
        issues.push(`Unknown service account keys detected: ${unknownServiceAccountKeys.join(', ')}`);
    }
    if (unknownCertificates.length) {
        issues.push(`Unknown certificates detected: ${unknownCertificates.join(', ')}`);
    }
    const summary = {
        reportPath,
        usageSummary,
        additionalSummaries,
        relationshipIssues: issues,
        foreignKeyIssues: {
            unknownProjects,
            unknownServiceAccounts,
            unknownServiceAccountKeys,
            unknownCertificates,
        },
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2));
}
main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[admin-ingestion-spike] fatal error', error);
    process.exitCode = 1;
});
