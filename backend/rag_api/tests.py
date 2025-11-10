from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

# Create your tests here.

class HealthCheckTestCase(APITestCase):
    """Test the health check endpoint"""
    
    def test_health_check(self):
        """Test that health check returns 200 OK"""
        url = reverse('health')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'healthy')


class SearchAPITestCase(APITestCase):
    """Test the search endpoint"""
    
    def test_search_without_question(self):
        """Test that search without question returns 400"""
        url = reverse('search')
        response = self.client.post(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_search_with_question(self):
        """Test that search with question returns 200"""
        url = reverse('search')
        data = {'question': 'What is agriculture?'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('overview', response.data)
        self.assertIn('documents', response.data)
        self.assertIn('related_questions', response.data)


# Example model tests (when you add models)
# class DocumentCacheModelTest(TestCase):
#     def test_create_document_cache(self):
#         doc = DocumentCache.objects.create(
#             document_key="test.txt",
#             document_data={"title": "Test"}
#         )
#         self.assertEqual(doc.document_key, "test.txt")
#         self.assertEqual(doc.status, "active")
