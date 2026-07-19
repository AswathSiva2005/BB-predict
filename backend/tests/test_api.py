import os
import unittest
from uuid import uuid4

os.environ.setdefault('MONGODB_URL', 'mongodb://localhost:27017')
os.environ.setdefault('MONGODB_DATABASE', 'bb_predict_test')
os.environ.setdefault('SECRET_KEY', 'test-only-secret-key-with-at-least-32-characters')
os.environ.setdefault('FRONTEND_ORIGINS', 'http://localhost:5173')

import mongomock
from fastapi.testclient import TestClient

from backend.api.dependencies import get_db
from backend.main import app


def _database():
    return mongomock.MongoClient().bb_predict_test


class ApiTests(unittest.TestCase):
    def tearDown(self):
        app.app.dependency_overrides.clear()

    def test_auth_profile_and_history_flow(self):
        database = _database()
        app.app.dependency_overrides[get_db] = lambda: database
        client = TestClient(app)

        email = f'test-{uuid4().hex}@example.com'
        registration = client.post(
            '/api/auth/register',
            json={'full_name': 'Test User', 'email': email, 'password': 'StrongPass123!'},
        )
        self.assertEqual(registration.status_code, 201)

        login = client.post('/api/auth/login', json={'email': email, 'password': 'StrongPass123!'})
        self.assertEqual(login.status_code, 200)
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

        self.assertEqual(client.get('/api/auth/me', headers=headers).status_code, 200)
        history = client.get('/api/history', headers=headers)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json(), {'predictions': [], 'trainings': []})

        update = client.put('/api/auth/me', headers=headers, json={'full_name': 'Updated User'})
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.json()['full_name'], 'Updated User')
        client.close()

    def test_health_is_public(self):
        client = TestClient(app)
        response = client.get('/api/health')
        client.close()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')


if __name__ == '__main__':
    unittest.main()
