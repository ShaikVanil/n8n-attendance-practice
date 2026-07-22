import 'dart:async';
import 'dart:collection';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'battery_optimization_service.dart';

class NetworkOptimizationService {
  static final NetworkOptimizationService _instance = NetworkOptimizationService._internal();
  factory NetworkOptimizationService() => _instance;
  NetworkOptimizationService._internal();

  final BatteryOptimizationService _batteryService = BatteryOptimizationService();
  final Queue<NetworkRequest> _requestQueue = Queue<NetworkRequest>();
  final Map<String, dynamic> _responseCache = {};
  
  Timer? _batchTimer;
  bool _isBatchProcessing = false;
  
  static const Duration _batchInterval = Duration(seconds: 30);
  static const Duration _cacheExpiry = Duration(minutes: 10);

  // Batch network requests to reduce battery usage
  Future<Response?> queueRequest({
    required String method,
    required String url,
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
    bool priority = false,
  }) async {
    _batteryService.trackActivity('network_request');
    
    // Check cache first
    final cacheKey = _generateCacheKey(method, url, queryParameters);
    if (_responseCache.containsKey(cacheKey)) {
      final cachedResponse = _responseCache[cacheKey];
      if (_isCacheValid(cachedResponse['timestamp'])) {
        if (kDebugMode) {
          print('Using cached response for $url');
        }
        return cachedResponse['response'];
      } else {
        _responseCache.remove(cacheKey);
      }
    }

    final request = NetworkRequest(
      method: method,
      url: url,
      data: data,
      queryParameters: queryParameters,
      priority: priority,
      timestamp: DateTime.now(),
    );

    if (priority || _batteryService.shouldReduceNetworkRequests()) {
      // Execute immediately for priority requests or in power saving mode
      return await _executeRequest(request);
    } else {
      // Queue for batch processing
      _requestQueue.add(request);
      _scheduleBatchProcessing();
      return null; // Will be processed in batch
    }
  }

  void _scheduleBatchProcessing() {
    if (_batchTimer?.isActive == true) return;
    
    final interval = _batteryService.getNetworkRequestInterval();
    
    _batchTimer = Timer(interval, () {
      _processBatchRequests();
    });
  }

  Future<void> _processBatchRequests() async {
    if (_isBatchProcessing || _requestQueue.isEmpty) return;
    
    _isBatchProcessing = true;
    _batteryService.trackActivity('network_batch_processing');
    
    if (kDebugMode) {
      print('Processing ${_requestQueue.length} batched network requests');
    }

    final requests = List<NetworkRequest>.from(_requestQueue);
    _requestQueue.clear();

    // Sort by priority
    requests.sort((a, b) => b.priority ? 1 : 0);

    for (final request in requests) {
      try {
        await _executeRequest(request);
        
        // Add delay between requests in power saving mode
        if (_batteryService.shouldReduceNetworkRequests()) {
          await Future.delayed(const Duration(milliseconds: 500));
        }
      } catch (e) {
        if (kDebugMode) {
          print('Error executing batched request: $e');
        }
      }
    }

    _isBatchProcessing = false;
  }

  Future<Response?> _executeRequest(NetworkRequest request) async {
    try {
      final dio = Dio();
      
      // Configure timeout based on battery status
      final timeout = _batteryService.shouldReduceNetworkRequests() 
          ? const Duration(seconds: 10)
          : const Duration(seconds: 30);
      
      dio.options.connectTimeout = timeout;
      dio.options.receiveTimeout = timeout;

      Response response;
      
      switch (request.method.toUpperCase()) {
        case 'GET':
          response = await dio.get(
            request.url,
            queryParameters: request.queryParameters,
          );
          break;
        case 'POST':
          response = await dio.post(
            request.url,
            data: request.data,
            queryParameters: request.queryParameters,
          );
          break;
        case 'PUT':
          response = await dio.put(
            request.url,
            data: request.data,
            queryParameters: request.queryParameters,
          );
          break;
        case 'DELETE':
          response = await dio.delete(
            request.url,
            queryParameters: request.queryParameters,
          );
          break;
        default:
          throw UnsupportedError('HTTP method ${request.method} not supported');
      }

      // Cache successful responses
      if (response.statusCode == 200) {
        final cacheKey = _generateCacheKey(
          request.method, 
          request.url, 
          request.queryParameters,
        );
        _responseCache[cacheKey] = {
          'response': response,
          'timestamp': DateTime.now(),
        };
      }

      return response;
    } catch (e) {
      if (kDebugMode) {
        print('Network request failed: $e');
      }
      rethrow;
    }
  }

  String _generateCacheKey(String method, String url, Map<String, dynamic>? params) {
    return '$method:$url:${params?.toString() ?? ""}';
  }

  bool _isCacheValid(DateTime timestamp) {
    return DateTime.now().difference(timestamp) < _cacheExpiry;
  }

  // Force process all queued requests (e.g., before app goes to background)
  Future<void> flushRequestQueue() async {
    if (_requestQueue.isNotEmpty) {
      await _processBatchRequests();
    }
  }

  // Clear cache to free memory
  void clearCache() {
    _responseCache.clear();
    if (kDebugMode) {
      print('Network cache cleared');
    }
  }

  // Get network usage statistics
  Map<String, dynamic> getNetworkStats() {
    return {
      'queued_requests': _requestQueue.length,
      'cached_responses': _responseCache.length,
      'is_batch_processing': _isBatchProcessing,
    };
  }

  void dispose() {
    _batchTimer?.cancel();
    _requestQueue.clear();
    _responseCache.clear();
  }
}

class NetworkRequest {
  final String method;
  final String url;
  final Map<String, dynamic>? data;
  final Map<String, dynamic>? queryParameters;
  final bool priority;
  final DateTime timestamp;

  NetworkRequest({
    required this.method,
    required this.url,
    this.data,
    this.queryParameters,
    this.priority = false,
    required this.timestamp,
  });
}