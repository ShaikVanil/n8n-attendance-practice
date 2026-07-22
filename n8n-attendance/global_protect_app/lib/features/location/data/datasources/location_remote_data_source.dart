import 'package:dio/dio.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../models/office_location_model.dart';

abstract class LocationRemoteDataSource {
  Future<List<OfficeLocationModel>> getOfficeLocations();
  Future<List<OfficeLocationModel>> getOfficesWithDistances(double latitude, double longitude);
  Future<bool> validateLocationForClockIn(double latitude, double longitude);
}

class LocationRemoteDataSourceImpl implements LocationRemoteDataSource {
  final Dio dio;

  LocationRemoteDataSourceImpl({required this.dio});

  @override
  Future<List<OfficeLocationModel>> getOfficeLocations() async {
    try {
      final response = await dio.get(
        '${ApiConstants.baseUrl}${ApiConstants.officeLocationsEndpoint}',
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data; // Fix: Remove ['locations']
        return data.map((json) => OfficeLocationModel.fromJson(json)).toList();
      } else {
        throw ServerException();
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw NetworkException();
      } else {
        throw ServerException();
      }
    } catch (e) {
      throw ServerException();
    }
  }

  @override
  Future<List<OfficeLocationModel>> getOfficesWithDistances(double latitude, double longitude) async {
    try {
      final response = await dio.get(
        '${ApiConstants.baseUrl}/locations/with-distances',
        queryParameters: {
          'latitude': latitude,
          'longitude': longitude,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => OfficeLocationModel.fromJson(json)).toList();
      } else {
        throw ServerException();
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw NetworkException();
      } else {
        throw ServerException();
      }
    } catch (e) {
      throw ServerException();
    }
  }

  @override
  Future<bool> validateLocationForClockIn(double latitude, double longitude) async {
    try {
      final response = await dio.post(
        '${ApiConstants.baseUrl}${ApiConstants.validateLocationEndpoint}',
        data: {
          'latitude': latitude,
          'longitude': longitude,
        },
      );

      if (response.statusCode == 200) {
        return response.data['isValid'] ?? false;
      } else {
        throw ServerException();
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw NetworkException();
      } else {
        throw ServerException();
      }
    } catch (e) {
      throw ServerException();
    }
  }
}