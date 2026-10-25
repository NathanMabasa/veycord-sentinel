"""Fail release checks on high/critical SARIF security findings; no suppression bypass.
Consumes local CodeQL output only. It never prints source snippets or event payloads.
"""
import json
import math
import sys
from pathlib import Path

MAX_BYTES = 32 * 1024 * 1024


def high_security_findings(report):
    if report.get('version') != '2.1.0' or not isinstance(report.get('runs'), list) or not report['runs']:
        raise ValueError('Expected a non-empty SARIF 2.1.0 analysis')
    findings = []
    for run in report['runs']:
        if not isinstance(run.get('results'), list):
            raise ValueError('Analysis did not include a results array')
        for invocation in run.get('invocations', []):
            if invocation.get('executionSuccessful') is False:
                raise ValueError('Scanner execution was unsuccessful')
        tool = run.get('tool', {})
        components = [tool.get('driver', {})] + tool.get('extensions', [])
        rules = [rule for component in components for rule in component.get('rules', [])]
        for result in run['results']:
            rule_id = result.get('ruleId') or result.get('rule', {}).get('id')
            candidates = [rule for rule in rules if rule.get('id') == rule_id]
            if not candidates:
                raise ValueError('A result could not be resolved to its rule metadata')
            scores = []
            for rule in candidates:
                score = rule.get('properties', {}).get('security-severity')
                if score is not None:
                    score = float(score)
                    if not math.isfinite(score) or not 0 <= score <= 10:
                        raise ValueError('Invalid security severity metadata')
                    scores.append(score)
            if scores and max(scores) >= 7:
                location = (result.get('locations') or [{}])[0].get('physicalLocation', {})
                findings.append({
                    'rule': rule_id,
                    'severity': max(scores),
                    'path': location.get('artifactLocation', {}).get('uri', '')[:300],
                    'line': location.get('region', {}).get('startLine'),
                })
    return findings


def main(directory):
    files = sorted(Path(directory).glob('*.sarif'))
    if not files or len(files) > 20:
        raise ValueError('Expected 1 to 20 SARIF files')
    findings = []
    for file in files:
        with file.open('rb') as source:
            raw = source.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError('SARIF input exceeded the analysis limit')
        findings.extend(high_security_findings(json.loads(raw)))
    print(json.dumps({'highOrCriticalSecurityFindings': len(findings), 'findings': findings}))
    return 1 if findings else 0


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2:
            raise ValueError('Provide the local CodeQL SARIF directory')
        sys.exit(main(sys.argv[1]))
    except (ValueError, OSError, KeyError, TypeError, AttributeError):
        print('Security analysis gate could not validate the scanner output.', file=sys.stderr)
        sys.exit(2)
