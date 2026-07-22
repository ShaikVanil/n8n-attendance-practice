import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/error/exceptions.dart';
import '../../domain/entities/privacy_settings.dart';
import '../../domain/entities/user_data.dart';
import '../../domain/repositories/privacy_repository.dart';
import '../datasources/privacy_local_data_source.dart';
import '../datasources/privacy_remote_data_source.dart';
import '../models/privacy_settings_model.dart';

class PrivacyRepositoryImpl implements PrivacyRepository {
  final PrivacyLocalDataSource localDataSource;
  final PrivacyRemoteDataSource remoteDataSource;

  PrivacyRepositoryImpl({
    required this.localDataSource,
    required this.remoteDataSource,
  });

  @override
  Future<Either<Failure, PrivacySettings>> getPrivacySettings() async {
    try {
      final localSettings = await localDataSource.getPrivacySettings();
      return Right(localSettings);
    } on CacheException {
      try {
        final remoteSettings = await remoteDataSource.getPrivacySettings();
        await localDataSource.cachePrivacySettings(remoteSettings);
        return Right(remoteSettings);
      } on ServerException catch(e){
        return Left(ServerFailure(e.message));
      }
    }
  }

  @override
  Future<Either<Failure, void>> updatePrivacySettings(PrivacySettings settings) async {
    try {
      final settingsModel = PrivacySettingsModel.fromEntity(settings);
      await remoteDataSource.updatePrivacySettings(settingsModel);
      await localDataSource.cachePrivacySettings(settingsModel);
      return const Right(null);
    } on ServerException catch(e){
        return Left(ServerFailure(e.message));
    }
  }

  @override
  Future<Either<Failure, UserData>> getUserData() async {
    try {
      final userData = await remoteDataSource.getUserData();
      return Right(userData);
    } on ServerException catch (e){
      return Left(ServerFailure(e.message));
    }
  }

  @override
  Future<Either<Failure, void>> requestDataDeletion() async {
    try {
      await remoteDataSource.requestDataDeletion();
      await localDataSource.clearAllData();
      return const Right(null);
    } on ServerException catch (e){
      return Left(ServerFailure(e.message));
    }
  }
}