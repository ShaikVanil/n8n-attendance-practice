# Flutter BLoC Pattern Template

```yaml
template:
  id: flutter-bloc-template-v1
  name: Flutter BLoC with Events and States
  version: 1.0
  output:
    format: multiple_files
    directory: "lib/features/{{feature_name}}/presentation/bloc"

workflow:
  mode: interactive
  elicitation: standard

sections:
  - id: feature_name
    title: Feature Name
    type: text
    instruction: Enter the feature name (e.g., authentication, profile, home)
    validation: "^[a-z][a-z0-9_]*$"
    elicit: true
    
  - id: bloc_name
    title: BLoC Name
    type: text
    instruction: Enter the BLoC class name (PascalCase, e.g., Authentication, UserProfile)
    template: "{{feature_name|pascal_case}}"
    elicit: true
    
  - id: events
    title: BLoC Events
    type: list
    instruction: Define the events this BLoC will handle
    template: |
      - name: "{{event_name}}"
        description: "{{event_description}}"
        parameters:
          - name: "{{param_name}}"
            type: "{{param_type}}"
            required: {{is_required}}
    elicit: true
    example: |
      Examples:
      - LoginRequested (email: String, password: String)
      - LogoutRequested ()
      - ProfileUpdated (user: User)
      - DataLoading ()
    
  - id: states
    title: BLoC States  
    type: list
    instruction: Define the states this BLoC will emit
    template: |
      - name: "{{state_name}}"
        description: "{{state_description}}"
        parameters:
          - name: "{{param_name}}"
            type: "{{param_type}}"
    elicit: true
    example: |
      Examples:
      - Initial ()
      - Loading ()
      - Success (data: ModelType)
      - Failure (message: String)
      
  - id: use_cases
    title: Use Cases
    type: list
    instruction: List the use cases this BLoC will depend on
    elicit: true
    example: "LoginUseCase, GetUserProfileUseCase, etc."

files:
  - path: "{{feature_name}}_event.dart"
    content: |
      import 'package:equatable/equatable.dart';
      {{#each event_imports}}
      import '{{this}}';
      {{/each}}
      
      /// Abstract base class for all {{bloc_name}} events
      abstract class {{bloc_name}}Event extends Equatable {
        const {{bloc_name}}Event();
        
        @override
        List<Object?> get props => [];
      }
      
      {{#each events}}
      /// {{description}}
      class {{name}} extends {{../bloc_name}}Event {
        {{#each parameters}}
        final {{type}} {{name}};
        {{/each}}
        
        const {{name}}({{#if parameters}}{
          {{#each parameters}}
          {{#if required}}required {{/if}}this.{{name}},
          {{/each}}
        }{{/if}});
        
        @override
        List<Object?> get props => [{{#each parameters}}{{name}},{{/each}}];
      }
      
      {{/each}}

  - path: "{{feature_name}}_state.dart"
    content: |
      import 'package:equatable/equatable.dart';
      {{#each state_imports}}
      import '{{this}}';
      {{/each}}
      
      /// Abstract base class for all {{bloc_name}} states
      abstract class {{bloc_name}}State extends Equatable {
        const {{bloc_name}}State();
        
        @override
        List<Object?> get props => [];
      }
      
      {{#each states}}
      /// {{description}}
      class {{../bloc_name}}{{name}} extends {{../bloc_name}}State {
        {{#each parameters}}
        final {{type}} {{name}};
        {{/each}}
        
        {{#if parameters}}
        const {{../bloc_name}}{{name}}({{#if parameters}}{
          {{#each parameters}}
          required this.{{name}},
          {{/each}}
        }{{/if}});
        
        @override
        List<Object?> get props => [{{#each parameters}}{{name}},{{/each}}];
        {{else}}
        const {{../bloc_name}}{{name}}();
        {{/if}}
      }
      
      {{/each}}

  - path: "{{feature_name}}_bloc.dart"
    content: |
      import 'package:flutter_bloc/flutter_bloc.dart';
      import 'package:injectable/injectable.dart';
      import '{{feature_name}}_event.dart';
      import '{{feature_name}}_state.dart';
      {{#each use_case_imports}}
      import '{{this}}';
      {{/each}}
      
      /// BLoC for managing {{feature_name}} feature state
      @injectable
      class {{bloc_name}}Bloc extends Bloc<{{bloc_name}}Event, {{bloc_name}}State> {
        {{#each use_cases}}
        final {{name}} _{{name|camel_case}};
        {{/each}}
        
        {{bloc_name}}Bloc({{#if use_cases}}{
          {{#each use_cases}}
          required {{name}} {{name|camel_case}},
          {{/each}}
        }{{/if}}) : 
        {{#each use_cases}}
          _{{name|camel_case}} = {{name|camel_case}},
        {{/each}}
          super(const {{bloc_name}}Initial()) {
        {{#each events}}
        on<{{name}}>(_on{{name}});
        {{/each}}
      }
      
      {{#each events}}
      /// Handles {{name}} event
      Future<void> _on{{name}}(
        {{name}} event,
        Emitter<{{../bloc_name}}State> emit,
      ) async {
        // TODO: Implement {{name}} logic
        try {
          emit(const {{../bloc_name}}Loading());
          
          // Example implementation - replace with actual logic
          {{#if ../use_cases}}
          {{#each ../use_cases}}
          // final result = await _{{name|camel_case}}.call(params);
          {{/each}}
          {{/if}}
          
          // Success case
          // emit({{../bloc_name}}Success(data: result));
          
        } catch (error) {
          emit({{../bloc_name}}Failure(message: error.toString()));
        }
      }
      
      {{/each}}
    }

  - path: "{{feature_name}}_bloc_test.dart"
    content: |
      import 'package:bloc_test/bloc_test.dart';
      import 'package:flutter_test/flutter_test.dart';
      import 'package:mocktail/mocktail.dart';
      import 'package:{{project_name}}/features/{{feature_name}}/presentation/bloc/{{feature_name}}_bloc.dart';
      import 'package:{{project_name}}/features/{{feature_name}}/presentation/bloc/{{feature_name}}_event.dart';
      import 'package:{{project_name}}/features/{{feature_name}}/presentation/bloc/{{feature_name}}_state.dart';
      {{#each use_case_imports}}
      import '{{this}}';
      {{/each}}
      
      {{#each use_cases}}
      class Mock{{name}} extends Mock implements {{name}} {}
      {{/each}}
      
      void main() {
        group('{{bloc_name}}Bloc', () {
          {{#each use_cases}}
          late Mock{{name}} mock{{name}};
          {{/each}}
          late {{bloc_name}}Bloc {{bloc_name|camel_case}}Bloc;
          
          setUp(() {
            {{#each use_cases}}
            mock{{name}} = Mock{{name}}();
            {{/each}}
            {{bloc_name|camel_case}}Bloc = {{bloc_name}}Bloc({{#if use_cases}}
              {{#each use_cases}}
              {{name|camel_case}}: mock{{name}},
              {{/each}}
            {{/if}});
          });
          
          test('initial state is {{bloc_name}}Initial', () {
            expect({{bloc_name|camel_case}}Bloc.state, equals(const {{bloc_name}}Initial()));
          });
          
          {{#each events}}
          group('{{name}}', () {
            blocTest<{{../bloc_name}}Bloc, {{../bloc_name}}State>(
              'emits [Loading, Success] when {{name}} succeeds',
              build: () {
                // Setup mock behavior
                {{#each ../use_cases}}
                // when(() => mock{{name}}.call(any())).thenAnswer((_) async => mockResult);
                {{/each}}
                return {{../bloc_name|camel_case}}Bloc;
              },
              act: (bloc) => bloc.add(const {{name}}({{#each parameters}}
                {{#if @first}}{{name}}: /* test value */,{{else}}{{name}}: /* test value */,{{/if}}
              {{/each}})),
              expect: () => [
                const {{../bloc_name}}Loading(),
                // const {{../bloc_name}}Success(data: expectedResult),
              ],
              verify: (_) {
                {{#each ../use_cases}}
                // verify(() => mock{{name}}.call(any())).called(1);
                {{/each}}
              },
            );
            
            blocTest<{{../bloc_name}}Bloc, {{../bloc_name}}State>(
              'emits [Loading, Failure] when {{name}} fails',
              build: () {
                {{#each ../use_cases}}
                // when(() => mock{{name}}.call(any())).thenThrow(Exception('Test error'));
                {{/each}}
                return {{../bloc_name|camel_case}}Bloc;
              },
              act: (bloc) => bloc.add(const {{name}}({{#each parameters}}
                {{#if @first}}{{name}}: /* test value */,{{else}}{{name}}: /* test value */,{{/if}}
              {{/each}})),
              expect: () => [
                const {{../bloc_name}}Loading(),
                const {{../bloc_name}}Failure(message: 'Exception: Test error'),
              ],
            );
          });
          
          {{/each}}
        });
      }

additional_files:
  - path: "lib/features/{{feature_name}}/presentation/pages/{{feature_name}}_page.dart"
    description: "Example page that uses the BLoC"
    content: |
      import 'package:flutter/material.dart';
      import 'package:flutter_bloc/flutter_bloc.dart';
      import '../bloc/{{feature_name}}_bloc.dart';
      import '../bloc/{{feature_name}}_event.dart';
      import '../bloc/{{feature_name}}_state.dart';
      
      class {{bloc_name}}Page extends StatelessWidget {
        const {{bloc_name}}Page({super.key});
        
        @override
        Widget build(BuildContext context) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('{{bloc_name}}'),
            ),
            body: BlocListener<{{bloc_name}}Bloc, {{bloc_name}}State>(
              listener: (context, state) {
                if (state is {{bloc_name}}Failure) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message)),
                  );
                }
              },
              child: BlocBuilder<{{bloc_name}}Bloc, {{bloc_name}}State>(
                builder: (context, state) {
                  return switch (state) {
                    {{bloc_name}}Initial() => _buildInitialWidget(),
                    {{bloc_name}}Loading() => const Center(
                      child: CircularProgressIndicator(),
                    ),
                    {{#each states}}
                    {{#unless (eq name "Initial")}}
                    {{#unless (eq name "Loading")}}
                    {{../bloc_name}}{{name}}() => _build{{name}}Widget(state),
                    {{/unless}}
                    {{/unless}}
                    {{/each}}
                  };
                },
              ),
            ),
          );
        }
        
        Widget _buildInitialWidget() {
          return const Center(
            child: Text('{{bloc_name}} Initial State'),
          );
        }
        
        {{#each states}}
        {{#unless (eq name "Initial")}}
        {{#unless (eq name "Loading")}}
        Widget _build{{name}}Widget({{../bloc_name}}{{name}} state) {
          return Center(
            child: Text('{{../bloc_name}} {{name}} State'),
          );
        }
        
        {{/unless}}
        {{/unless}}
        {{/each}}
      }

instructions:
  setup_steps:
    - "Generate event classes with proper Equatable implementation"
    - "Generate state classes with proper Equatable implementation"  
    - "Generate BLoC class with dependency injection annotations"
    - "Generate comprehensive unit tests with mocktail"
    - "Create example page showing BLoC usage patterns"
    - "Ensure proper imports and file organization"
    
  best_practices:
    - "Always extend Equatable for events and states"
    - "Use descriptive names for events and states"
    - "Include comprehensive error handling"
    - "Write tests for all event handlers"
    - "Use dependency injection for use cases"
    - "Follow single responsibility principle"
    
  testing_guidelines:
    - "Test initial state"
    - "Test each event with success and failure cases"
    - "Mock all external dependencies"
    - "Verify use case calls"
    - "Test state transitions"
```