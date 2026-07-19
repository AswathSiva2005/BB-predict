"""Live API smoke test. Creates and removes an isolated Atlas test account."""

from __future__ import annotations

import argparse
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.main import app


def run(include_explanations: bool = False, include_training: bool = False) -> None:
    email = f'e2e-{uuid4().hex}@example.com'
    password = f'Smoke-{uuid4().hex}!'
    client = TestClient(app)
    headers: dict[str, str] = {}

    try:
        registration = client.post(
            '/api/auth/register',
            json={'full_name': 'E2E Smoke User', 'email': email, 'password': password},
        )
        registration.raise_for_status()

        login = client.post('/api/auth/login', json={'email': email, 'password': password})
        login.raise_for_status()
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

        checks = {
            'profile': client.get('/api/auth/me', headers=headers),
            'stocks': client.get('/api/stocks', headers=headers),
            'explore_insights': client.get(
                '/api/explore/insights',
                headers=headers,
                params={'symbol': 'RELIANCE'},
            ),
            'prediction': client.post(
                '/api/predict',
                headers=headers,
                json={'symbol': 'RELIANCE', 'sample_index': -1},
            ),
            'history': client.get('/api/history', headers=headers),
        }
        if include_training:
            checks['training'] = client.post(
                '/api/train',
                headers=headers,
                json={'symbols': None},
            )
        if include_explanations:
            checks['explanation'] = client.post(
                '/api/explain',
                headers=headers,
                json={
                    'symbol': 'RELIANCE',
                    'sample_index': -1,
                    'explanation_type': 'both',
                    'sample_size': 30,
                    'max_display': 8,
                    'num_features': 5,
                },
            )

        failures = {}
        for name, response in checks.items():
            if response.is_success:
                print(f'{name}=ok')
            else:
                failures[name] = f'{response.status_code}: {response.text[:300]}'
        if failures:
            raise RuntimeError(f'Live smoke failures: {failures}')
    finally:
        if headers:
            deletion = client.delete('/api/auth/me', headers=headers)
            print(f'cleanup={deletion.status_code}')
        client.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--include-explanations', action='store_true')
    parser.add_argument('--include-training', action='store_true')
    args = parser.parse_args()
    run(
        include_explanations=args.include_explanations,
        include_training=args.include_training,
    )
