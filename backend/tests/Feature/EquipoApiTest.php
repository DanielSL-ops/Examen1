<?php

use App\Models\Categoria;
use App\Models\Equipo;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/*
| TODO [B6] Escriba las tres pruebas. Cada una debe verificar el código
| de estado Y algo más (estructura, encabezado, mensaje o estado de la base).
|
| Quite el ->todo() de cada prueba al implementarla.
| Ejecute:  php artisan test --filter=EquipoApi
*/

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create());
});

it('crea un equipo y responde 201 con el encabezado Location', function () {
    $categoria = Categoria::factory()->create();
    $datos = [
        'codigo' => 'EQ-1234',
        'nombre' => 'Laptop de laboratorio',
        'categoria_id' => $categoria->id,
        'fecha_adquisicion' => '2020-01-15',
        'costo_interno' => 150000,
    ];

    $respuesta = $this->postJson('/api/equipos', $datos);

    $respuesta->assertCreated()
        ->assertHeader('Location', route('equipos.show', $respuesta->json('data.id')))
        ->assertExactJson(['data' => [
            'id' => $respuesta->json('data.id'),
            'codigo' => 'EQ-1234',
            'nombre' => 'Laptop de laboratorio',
            'estado' => 'disponible',
            'fecha_adquisicion' => '2020-01-15',
            'categoria' => ['id' => $categoria->id, 'nombre' => $categoria->nombre],
        ]]);

    $this->assertDatabaseHas('equipos', [
        ...$datos,
        'fecha_adquisicion' => '2020-01-15 00:00:00',
    ]);
});

it('rechaza un equipo con datos inválidos y responde 422 con errores por campo', function () {
    $this->postJson('/api/equipos', [
        'codigo' => 'INVALIDO',
        'nombre' => 'A',
        'categoria_id' => 999999,
        'estado' => 'prestado',
        'fecha_adquisicion' => now()->addDay()->toDateString(),
        'costo_interno' => -1,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors([
            'codigo', 'nombre', 'categoria_id', 'estado', 'fecha_adquisicion', 'costo_interno',
        ])
        ->assertJsonPath('errors.codigo.0', 'El código debe tener el formato EQ-0000.');

    $this->assertDatabaseCount('equipos', 0);
});

it('impide eliminar un equipo prestado y responde 409', function () {
    $equipo = Equipo::factory()->prestado()->create();

    $this->deleteJson("/api/equipos/{$equipo->id}")
        ->assertConflict()
        ->assertExactJson([
            'mensaje' => 'No se puede eliminar un equipo prestado.',
            'codigo' => 'REGLA_NEGOCIO',
        ]);

    $this->assertDatabaseHas('equipos', ['id' => $equipo->id, 'estado' => 'prestado']);
});
