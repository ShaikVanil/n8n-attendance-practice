import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PrivacyPolicyPage extends StatelessWidget {
  const PrivacyPolicyPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSection(
              'Data Collection',
              'We collect location data only during work hours to verify your attendance. This includes GPS coordinates and WiFi network information when you clock in or out.',
            ),
            _buildSection(
              'Data Usage',
              'Your location data is used exclusively for attendance tracking and verification. We do not share this information with third parties or use it for any other purpose.',
            ),
            _buildSection(
              'Data Storage',
              'All data is encrypted and stored securely. Location data is automatically deleted after 90 days unless required for compliance purposes.',
            ),
            _buildSection(
              'Your Rights',
              'You have the right to view, modify, or delete your personal data. You can also opt out of non-essential features while maintaining core attendance functionality.',
            ),
            _buildSection(
              'Contact Information',
              'For privacy-related questions or requests, please contact your HR department or system administrator.',
            ),
            const SizedBox(height: 24),
            Center(
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('I Understand'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: Colors.black54,
            ),
          ),
        ],
      ),
    );
  }
}