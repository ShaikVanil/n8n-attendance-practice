# Create Flutter Feature Complete

**Task ID**: create-feature-complete
**Agent**: flutter-dev
**Purpose**: Create a complete Flutter feature following Clean Architecture principles and BLoC pattern
**Elicit**: true

## Overview

This task guides you through creating a complete Flutter feature with proper separation of concerns, following Clean Architecture principles and implementing the BLoC pattern for state management.

## Prerequisites

- Flutter project already initialized
- Clean architecture structure already set up
- Dependencies properly configured in pubspec.yaml

## Interactive Process

### Step 1: Feature Planning
Ask the user for the following information:

1. **Feature Name**: What feature are you creating? (e.g., authentication, user_profile, product_catalog)
   - Must be lowercase with underscores
   - Will be used for folder structure

2. **Feature Description**: Brief description of what this feature does

3. **Domain Entities**: What are the core business objects?
   - Example: User, Product, Order
   - Include key properties for each entity

4. **Use Cases**: What actions can users perform?
   - Example: LoginUser, RegisterUser, GetUserProfile, UpdateProfile
   - Include parameters and return types

5. **Data Sources**: Where does the data come from?
   - Remote API endpoints
   - Local storage requirements
   - External services

6. **UI Requirements**: What screens and widgets are needed?
   - List of pages/screens
   - Key UI components
   - Navigation requirements

## Implementation Steps

### Step 2: Domain Layer Implementation

**Execute in this order:**

#### 2.1 Create Entities
```bash
# Create directory: lib/features/{feature_name}/domain/entities/
```

For each entity identified:
- Create entity class with proper properties
- Implement Equatable for value equality
- Add proper toString methods
- Include documentation

**Template for Entity:**
```dart
import 'package:equatable/equatable.dart';

/// [EntityName] entity representing core business logic
class EntityName extends Equatable {
  final String id;
  final String name;
  // Add other properties
  
  const EntityName({
    required this.id,
    required this.name,
    // Add other properties
  });
  
  @override
  List<Object?> get props => [id, name]; // Include all properties
  
  @override
  String toString() => 'EntityName(id: $id, name: $name)';
}
```

#### 2.2 Create Repository Abstractions
```bash
# Create directory: lib/features/{feature_name}/domain/repositories/
```

**Template for Repository Interface:**
```dart
import 'package:dartz/dartz.dart';
import '../../core/error/failures.dart';
import '../entities/entity_name.dart';

/// Abstract repository interface for {feature_name} feature
abstract class FeatureRepository {
  Future<Either<Failure, EntityName>> getEntity(String id);
  Future<Either<Failure, List<EntityName>>> getEntities();
  Future<Either<Failure, EntityName>> createEntity(EntityName entity);
  Future<Either<Failure, EntityName>> updateEntity(EntityName entity);
  Future<Either<Failure, void>> deleteEntity(String id);
}
```

#### 2.3 Create Use Cases
```bash
# Create directory: lib/features/{feature_name}/domain/usecases/
```

For each use case, create individual classes:

**Template for Use Case:**
```dart
import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/error/failures.dart';
import '../../core/usecases/usecase.dart';
import '../entities/entity_name.dart';
import '../repositories/feature_repository.dart';

/// Use case for [specific action]
class UseCaseName implements UseCase<EntityName, UseCaseParams> {
  final FeatureRepository repository;
  
  UseCaseName(this.repository);
  
  @override
  Future<Either<Failure, EntityName>> call(UseCaseParams params) async {
    return await repository.methodName(params.id);
  }
}

class UseCaseParams extends Equatable {
  final String id;
  // Add other parameters
  
  const UseCaseParams({required this.id});
  
  @override
  List<Object?> get props => [id];
}
```

### Step 3: Data Layer Implementation

#### 3.1 Create Data Models
```bash
# Create directory: lib/features/{feature_name}/data/models/
```

**Template for Model:**
```dart
import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/entity_name.dart';

part 'entity_model.g.dart';

/// Data model for [EntityName] with JSON serialization
@JsonSerializable()
class EntityModel extends EntityName {
  const EntityModel({
    required super.id,
    required super.name,
    // Add other properties with super.
  });
  
  /// Create model from domain entity
  factory EntityModel.fromEntity(EntityName entity) {
    return EntityModel(
      id: entity.id,
      name: entity.name,
      // Map other properties
    );
  }
  
  /// Create model from JSON
  factory EntityModel.fromJson(Map<String, dynamic> json) => 
      _$EntityModelFromJson(json);
  
  /// Convert model to JSON
  Map<String, dynamic> toJson() => _$EntityModelToJson(this);
  
  /// Convert to domain entity
  EntityName toEntity() {
    return EntityName(
      id: id,
      name: name,
      // Map other properties
    );
  }
}
```

#### 3.2 Create Data Sources
```bash
# Create directories: 
# lib/features/{feature_name}/data/datasources/
# lib/features/{feature_name}/data/datasources/remote/
# lib/features/{feature_name}/data/datasources/local/
```

**Template for Remote Data Source:**
```dart
import 'package:dio/dio.dart';
import '../models/entity_model.dart';

/// Remote data source for {feature_name}
abstract class FeatureRemoteDataSource {
  Future<EntityModel> getEntity(String id);
  Future<List<EntityModel>> getEntities();
  Future<EntityModel> createEntity(EntityModel entity);
  Future<EntityModel> updateEntity(EntityModel entity);  
  Future<void> deleteEntity(String id);
}

class FeatureRemoteDataSourceImpl implements FeatureRemoteDataSource {
  final Dio dio;
  
  FeatureRemoteDataSourceImpl({required this.dio});
  
  @override
  Future<EntityModel> getEntity(String id) async {
    try {
      final response = await dio.get('/api/entities/$id');
      return EntityModel.fromJson(response.data);
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
  
  // Implement other methods...
}
```

#### 3.3 Create Repository Implementation
```bash
# Create directory: lib/features/{feature_name}/data/repositories/
```

**Template for Repository Implementation:**
```dart
import 'package:dartz/dartz.dart';
import '../../core/error/exceptions.dart';
import '../../core/error/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/entity_name.dart';
import '../../domain/repositories/feature_repository.dart';
import '../datasources/local/feature_local_data_source.dart';
import '../datasources/remote/feature_remote_data_source.dart';

class FeatureRepositoryImpl implements FeatureRepository {
  final FeatureRemoteDataSource remoteDataSource;
  final FeatureLocalDataSource localDataSource;
  final NetworkInfo networkInfo;
  
  FeatureRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });
  
  @override
  Future<Either<Failure, EntityName>> getEntity(String id) async {
    if (await networkInfo.isConnected) {
      try {
        final remoteEntity = await remoteDataSource.getEntity(id);
        await localDataSource.cacheEntity(remoteEntity);
        return Right(remoteEntity.toEntity());
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      try {
        final localEntity = await localDataSource.getLastEntity(id);
        return Right(localEntity.toEntity());
      } on CacheException catch (e) {
        return Left(CacheFailure(e.message));
      }
    }
  }
  
  // Implement other methods...
}
```

### Step 4: Presentation Layer Implementation

#### 4.1 Create BLoC Components
Use the `*create-bloc` command or the bloc template to generate:
- Events
- States  
- BLoC class
- Unit tests

#### 4.2 Create Pages/Screens
```bash
# Create directory: lib/features/{feature_name}/presentation/pages/
```

**Template for Page:**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/feature_bloc.dart';
import '../widgets/feature_widgets.dart';

class FeaturePage extends StatelessWidget {
  const FeaturePage({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feature'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<FeatureBloc>().add(const RefreshRequested());
            },
          ),
        ],
      ),
      body: BlocConsumer<FeatureBloc, FeatureState>(
        listener: (context, state) {
          if (state is FeatureFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          return switch (state) {
            FeatureInitial() => _buildInitialState(),
            FeatureLoading() => _buildLoadingState(),
            FeatureLoaded(:final entities) => _buildLoadedState(entities),
            FeatureFailure() => _buildErrorState(),
          };
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/feature/create'),
        child: const Icon(Icons.add),
      ),
    );
  }
  
  Widget _buildInitialState() {
    return const Center(
      child: Text('Welcome to Feature Page'),
    );
  }
  
  Widget _buildLoadingState() {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }
  
  Widget _buildLoadedState(List<Entity> entities) {
    return ListView.builder(
      itemCount: entities.length,
      itemBuilder: (context, index) {
        final entity = entities[index];
        return EntityListItem(entity: entity);
      },
    );
  }
  
  Widget _buildErrorState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64),
          SizedBox(height: 16),
          Text('Something went wrong'),
        ],
      ),
    );
  }
}
```

#### 4.3 Create Reusable Widgets
```bash
# Create directory: lib/features/{feature_name}/presentation/widgets/
```

### Step 5: Dependency Injection Setup

Update the dependency injection configuration:

```dart
// In injection_container.dart
@module
abstract class FeatureModule {
  // Data Sources
  @lazySingleton
  FeatureRemoteDataSource get remoteDataSource => 
      FeatureRemoteDataSourceImpl(dio: getIt<Dio>());
      
  @lazySingleton
  FeatureLocalDataSource get localDataSource => 
      FeatureLocalDataSourceImpl();
      
  // Repository
  @lazySingleton
  FeatureRepository get repository => FeatureRepositoryImpl(
    remoteDataSource: getIt<FeatureRemoteDataSource>(),
    localDataSource: getIt<FeatureLocalDataSource>(),
    networkInfo: getIt<NetworkInfo>(),
  );
  
  // Use Cases
  @lazySingleton
  GetEntityUseCase get getEntityUseCase => 
      GetEntityUseCase(getIt<FeatureRepository>());
      
  // BLoC
  @factory
  FeatureBloc get featureBloc => FeatureBloc(
    getEntityUseCase: getIt<GetEntityUseCase>(),
    // Add other use cases
  );
}
```

### Step 6: Testing Implementation

#### 6.1 Domain Layer Tests
```bash
# Create directory: test/features/{feature_name}/domain/
```

Test entities, use cases, and repository contracts.

#### 6.2 Data Layer Tests  
```bash
# Create directory: test/features/{feature_name}/data/
```

Test models, data sources, and repository implementations.

#### 6.3 Presentation Layer Tests
```bash
# Create directory: test/features/{feature_name}/presentation/
```

Test BLoCs, pages, and widgets.

## Validation Checklist

After implementation, verify:

- [ ] All files follow proper naming conventions
- [ ] Clean architecture layers are properly separated
- [ ] BLoC pattern is correctly implemented
- [ ] Dependency injection is configured
- [ ] Comprehensive tests are written
- [ ] Error handling is implemented
- [ ] UI follows Material Design principles
- [ ] Accessibility is considered
- [ ] Performance optimizations are applied
- [ ] Documentation is complete

## Final Steps

1. Run `flutter pub get` to install any new dependencies
2. Run `build_runner` if using code generation
3. Run all tests to ensure everything works
4. Update navigation routes if needed
5. Update main.dart with new BLoC providers if necessary

## Common Issues and Solutions

**Issue**: Circular dependencies
**Solution**: Ensure proper dependency direction (Presentation → Domain ← Data)

**Issue**: Missing code generation files  
**Solution**: Run `flutter packages pub run build_runner build`

**Issue**: BLoC not updating UI
**Solution**: Check if BlocProvider is properly set up and events are being dispatched

**Issue**: Tests failing
**Solution**: Ensure all mocks are properly configured and test data is valid

This task ensures that your Flutter feature follows all best practices and integrates seamlessly with the existing codebase.