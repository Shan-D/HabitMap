import requests
import sys
import json
from datetime import datetime, timedelta

class HabitMapAPITester:
    def __init__(self, base_url="https://habitviz.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_auth_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data={"email": test_email, "password": test_password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user_id']
            return True, test_email, test_password
        return False, None, None

    def test_auth_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_habits_crud(self):
        """Test habits CRUD operations"""
        # Create habit
        habit_data = {"name": "Test Exercise", "color": "#a8b5a1"}
        success, response = self.run_test(
            "Create Habit",
            "POST",
            "/habits",
            200,
            data=habit_data
        )
        
        if not success:
            return False
        
        habit_id = response.get('id')
        if not habit_id:
            self.log_test("Create Habit - Get ID", False, "No habit ID returned")
            return False

        # Get habits
        success, habits = self.run_test(
            "Get Habits",
            "GET",
            "/habits",
            200
        )
        
        if not success or not isinstance(habits, list):
            return False

        # Update habit
        update_data = {"name": "Updated Exercise", "color": "#74c69d"}
        success, _ = self.run_test(
            "Update Habit",
            "PUT",
            f"/habits/{habit_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False

        # Delete habit
        success, _ = self.run_test(
            "Delete Habit",
            "DELETE",
            f"/habits/{habit_id}",
            200
        )
        
        return success

    def test_habit_logs(self):
        """Test habit logging"""
        # First create a habit
        habit_data = {"name": "Test Logging", "color": "#b8d4e8"}
        success, habit_response = self.run_test(
            "Create Habit for Logging",
            "POST",
            "/habits",
            200,
            data=habit_data
        )
        
        if not success:
            return False
        
        habit_id = habit_response.get('id')
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create habit log
        log_data = {
            "habit_id": habit_id,
            "date": today,
            "completed": True
        }
        
        success, _ = self.run_test(
            "Create Habit Log",
            "POST",
            "/habit-logs",
            200,
            data=log_data
        )
        
        if not success:
            return False

        # Get habit logs
        success, logs = self.run_test(
            "Get Habit Logs",
            "GET",
            "/habit-logs",
            200
        )
        
        # Clean up - delete the habit
        requests.delete(
            f"{self.api_url}/habits/{habit_id}",
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        return success and isinstance(logs, list)

    def test_mood_logs(self):
        """Test mood logging"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create mood log
        mood_data = {
            "date": today,
            "mood_level": 4,
            "emoji": "😊",
            "note": "Feeling good today!"
        }
        
        success, _ = self.run_test(
            "Create Mood Log",
            "POST",
            "/mood-logs",
            200,
            data=mood_data
        )
        
        if not success:
            return False

        # Get mood logs
        success, logs = self.run_test(
            "Get Mood Logs",
            "GET",
            "/mood-logs",
            200
        )
        
        if not success:
            return False

        # Delete mood log
        success, _ = self.run_test(
            "Delete Mood Log",
            "DELETE",
            f"/mood-logs/{today}",
            200
        )
        
        return success

    def test_analytics(self):
        """Test analytics endpoints"""
        # Test summary
        success, summary = self.run_test(
            "Get Analytics Summary",
            "GET",
            "/analytics/summary",
            200
        )
        
        if not success:
            return False

        # Verify summary structure
        expected_keys = ['total_habits', 'total_completions', 'avg_mood', 'habit_stats', 'mood_trend']
        if not all(key in summary for key in expected_keys):
            self.log_test("Analytics Summary Structure", False, "Missing expected keys")
            return False
        
        self.log_test("Analytics Summary Structure", True)

        # Test AI insights (this might take longer)
        print("🔍 Testing AI Insights (may take 10-15 seconds)...")
        success, insights = self.run_test(
            "Get AI Insights",
            "GET",
            "/analytics/ai-insights",
            200
        )
        
        if success and 'insights' in insights:
            self.log_test("AI Insights Response Structure", True)
        else:
            self.log_test("AI Insights Response Structure", False, "Missing insights key")
        
        return success

    def test_settings(self):
        """Test settings endpoints"""
        # Get settings
        success, settings = self.run_test(
            "Get Settings",
            "GET",
            "/settings",
            200
        )
        
        if not success:
            return False

        # Update settings
        update_data = {
            "theme": "dark",
            "color_palette": "ocean"
        }
        
        success, _ = self.run_test(
            "Update Settings",
            "PUT",
            "/settings",
            200,
            data=update_data
        )
        
        return success

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting HabitMap API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 50)

        # Test authentication
        print("\n📝 Testing Authentication...")
        reg_success, email, password = self.test_auth_register()
        if not reg_success:
            print("❌ Registration failed, stopping tests")
            return False

        login_success = self.test_auth_login(email, password)
        if not login_success:
            print("❌ Login failed, stopping tests")
            return False

        # Test all endpoints
        print("\n🎯 Testing Habits Management...")
        self.test_habits_crud()

        print("\n📊 Testing Habit Logging...")
        self.test_habit_logs()

        print("\n😊 Testing Mood Logging...")
        self.test_mood_logs()

        print("\n📈 Testing Analytics...")
        self.test_analytics()

        print("\n⚙️ Testing Settings...")
        self.test_settings()

        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed. Check details above.")
            return False

def main():
    tester = HabitMapAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())