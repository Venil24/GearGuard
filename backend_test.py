import requests
import sys
import json
from datetime import datetime

class GearGuardAPITester:
    def __init__(self, base_url="https://gearguard-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.manager_user = None
        self.technician_user = None
        self.employee_user = None
        self.test_equipment_id = None
        self.test_team_id = None
        self.test_request_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_database(self):
        """Seed the database with sample data"""
        print("\n🌱 Seeding database...")
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@gearguard.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.admin_user = response['user']
            print(f"   Admin logged in: {self.admin_user['name']}")
            return True
        return False

    def test_manager_login(self):
        """Test manager login"""
        success, response = self.run_test(
            "Manager Login",
            "POST",
            "auth/login",
            200,
            data={"email": "manager@gearguard.com", "password": "manager123"}
        )
        if success and 'access_token' in response:
            self.manager_user = response['user']
            print(f"   Manager user: {self.manager_user['name']}")
            return True
        return False

    def test_technician_login(self):
        """Test technician login"""
        success, response = self.run_test(
            "Technician Login",
            "POST",
            "auth/login",
            200,
            data={"email": "tech1@gearguard.com", "password": "tech123"}
        )
        if success and 'access_token' in response:
            self.technician_user = response['user']
            print(f"   Technician user: {self.technician_user['name']}")
            return True
        return False

    def test_employee_login(self):
        """Test employee login"""
        success, response = self.run_test(
            "Employee Login",
            "POST",
            "auth/login",
            200,
            data={"email": "employee@gearguard.com", "password": "employee123"}
        )
        if success and 'access_token' in response:
            self.employee_user = response['user']
            print(f"   Employee user: {self.employee_user['name']}")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Equipment: {response.get('total_equipment', 0)}")
            print(f"   New Requests: {response.get('requests', {}).get('new', 0)}")
            print(f"   Teams: {response.get('teams_count', 0)}")
        return success

    def test_get_equipment(self):
        """Test get equipment endpoint"""
        success, response = self.run_test(
            "Get Equipment",
            "GET",
            "equipment",
            200
        )
        if success and response:
            self.test_equipment_id = response[0]['id'] if response else None
            print(f"   Found {len(response)} equipment items")
            if self.test_equipment_id:
                print(f"   Test equipment ID: {self.test_equipment_id}")
        return success

    def test_get_teams(self):
        """Test get teams endpoint"""
        success, response = self.run_test(
            "Get Teams",
            "GET",
            "teams",
            200
        )
        if success and response:
            self.test_team_id = response[0]['id'] if response else None
            print(f"   Found {len(response)} teams")
            if self.test_team_id:
                print(f"   Test team ID: {self.test_team_id}")
        return success

    def test_get_maintenance_requests(self):
        """Test get maintenance requests endpoint"""
        success, response = self.run_test(
            "Get Maintenance Requests",
            "GET",
            "maintenance-requests",
            200
        )
        if success and response:
            self.test_request_id = response[0]['id'] if response else None
            print(f"   Found {len(response)} maintenance requests")
            if self.test_request_id:
                print(f"   Test request ID: {self.test_request_id}")
        return success

    def test_create_maintenance_request(self):
        """Test creating a maintenance request"""
        if not self.test_equipment_id:
            print("❌ Cannot test create request - no equipment ID")
            return False
            
        success, response = self.run_test(
            "Create Maintenance Request",
            "POST",
            "maintenance-requests",
            200,
            data={
                "subject": "Test maintenance request",
                "equipment_id": self.test_equipment_id,
                "request_type": "corrective",
                "description": "Test description"
            }
        )
        if success and 'id' in response:
            print(f"   Created request ID: {response['id']}")
            return True
        return False

    def test_update_request_status(self):
        """Test updating request status (drag-drop simulation)"""
        if not self.test_request_id:
            print("❌ Cannot test update request - no request ID")
            return False
            
        success, response = self.run_test(
            "Update Request Status",
            "PUT",
            f"maintenance-requests/{self.test_request_id}",
            200,
            data={"status": "in_progress"}
        )
        return success

    def test_scrap_workflow(self):
        """Test scrap workflow - moving request to scrap should mark equipment as not usable"""
        if not self.test_request_id:
            print("❌ Cannot test scrap workflow - no request ID")
            return False
            
        success, response = self.run_test(
            "Move Request to Scrap",
            "PUT",
            f"maintenance-requests/{self.test_request_id}",
            200,
            data={"status": "scrap"}
        )
        
        if success:
            # Check if equipment is marked as not usable
            eq_success, eq_response = self.run_test(
                "Check Equipment After Scrap",
                "GET",
                f"equipment/{self.test_equipment_id}",
                200
            )
            if eq_success and not eq_response.get('is_usable', True):
                print("   ✅ Equipment correctly marked as not usable")
                return True
            else:
                print("   ❌ Equipment not marked as not usable")
                return False
        return False

    def test_role_based_access(self):
        """Test role-based access control"""
        # Test manager creating preventive request
        manager_token = self.token
        
        # Switch to employee token (should fail for preventive)
        success, response = self.run_test(
            "Employee Login for Role Test",
            "POST",
            "auth/login",
            200,
            data={"email": "employee@gearguard.com", "password": "employee123"}
        )
        
        if success:
            employee_token = response['access_token']
            self.token = employee_token
            
            # Try to create preventive request as employee (should fail)
            success, response = self.run_test(
                "Employee Create Preventive Request (Should Fail)",
                "POST",
                "maintenance-requests",
                403,  # Expecting forbidden
                data={
                    "subject": "Preventive test",
                    "equipment_id": self.test_equipment_id,
                    "request_type": "preventive",
                    "description": "Should fail"
                }
            )
            
            # Restore admin token
            self.token = manager_token
            return success
        return False

    def test_users_endpoint(self):
        """Test users endpoint (admin only)"""
        success, response = self.run_test(
            "Get Users (Admin Only)",
            "GET",
            "users",
            200
        )
        if success:
            print(f"   Found {len(response)} users")
        return success

def main():
    print("🚀 Starting GearGuard API Tests")
    print("=" * 50)
    
    tester = GearGuardAPITester()
    
    # Test sequence
    tests = [
        ("Seed Database", tester.test_seed_database),
        ("Admin Login", tester.test_admin_login),
        ("Manager Login", tester.test_manager_login),
        ("Technician Login", tester.test_technician_login),
        ("Employee Login", tester.test_employee_login),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Get Equipment", tester.test_get_equipment),
        ("Get Teams", tester.test_get_teams),
        ("Get Maintenance Requests", tester.test_get_maintenance_requests),
        ("Create Maintenance Request", tester.test_create_maintenance_request),
        ("Update Request Status", tester.test_update_request_status),
        ("Scrap Workflow", tester.test_scrap_workflow),
        ("Role-Based Access", tester.test_role_based_access),
        ("Users Endpoint", tester.test_users_endpoint),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())