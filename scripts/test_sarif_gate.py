"""Synthetic unit fixtures for the local release scan gate."""
import unittest
from check_sarif import high_security_findings


def report(score='7.7', extension=False):
    component = {'rules': [{'id': 'fixture/rule', 'properties': {'security-severity': score}}]}
    tool = {'driver': component} if not extension else {'driver': {}, 'extensions': [component]}
    return {'version': '2.1.0', 'runs': [{'tool': tool, 'results': [{'ruleId': 'fixture/rule'}]}]}


class SecurityGate(unittest.TestCase):
    def test_high_and_critical_rules_in_driver_or_extension_are_blocked(self):
        for score in ['7', '7.7', '9.8']:
            for extension in [False, True]:
                self.assertEqual(len(high_security_findings(report(score, extension))), 1)

    def test_lower_severity_is_not_a_high_gate(self):
        self.assertEqual(high_security_findings(report('6.9')), [])

    def test_empty_results_pass_with_valid_analysis(self):
        value = report(); value['runs'][0]['results'] = []
        self.assertEqual(high_security_findings(value), [])

    def test_missing_or_invalid_scanner_evidence_fails_closed(self):
        for value in [{}, {'version': '2.1.0', 'runs': []}, report('NaN'), report('11')]:
            with self.assertRaises(ValueError): high_security_findings(value)
        value = report(); value['runs'][0]['tool']['driver']['rules'] = []
        with self.assertRaises(ValueError): high_security_findings(value)
        value = report(); value['runs'][0]['invocations'] = [{'executionSuccessful': False}]
        with self.assertRaises(ValueError): high_security_findings(value)


if __name__ == '__main__': unittest.main()
