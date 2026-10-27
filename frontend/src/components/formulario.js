import { crearEquipo, listarCategorias } from "../modules/equipos.js";
import { mostrarMensaje } from "./mensajes.js";

const $form = document.querySelector("#form-equipo");
const $selectCategoria = document.querySelector("#categoria_id");
const $btnGuardar = document.querySelector("#btn-guardar");

/**
 * TODO [F3] Formulario de registro de equipos.
 *
 * iniciarFormulario({ alGuardar }):
 *  1. Llene el <select id="categoria_id"> con listarCategorias()
 *     (cree cada <option> con createElement, value = id, texto = nombre).
 *  2. Al enviar el formulario (submit):
 *     - Evite el envío tradicional.
 *     - Limpie los errores anteriores: textContent de [data-error] y aria-invalid de los campos.
 *     - Construya el objeto con FormData. categoria_id y costo_interno deben ir como números.
 *     - Deshabilite #btn-guardar y cambie su texto a "Guardando…" mientras espera.
 *     - Llame a crearEquipo(datos).
 *     - Éxito: limpie el formulario, mostrarMensaje("exito", "Equipo <codigo> registrado.")
 *              y llame a alGuardar().
 *     - 422: por cada campo de error.datos.errors, escriba el PRIMER mensaje en
 *            el <p data-error="<campo>"> y marque el campo con aria-invalid="true".
 *     - Otro error: mostrarMensaje("error", ...).
 *     - Siempre (finally): rehabilite el botón y restaure su texto.
 */
export const iniciarFormulario = ({ alGuardar }) => {
  listarCategorias().then(({ data }) => {
    for (const categoria of data) {
      const opcion = document.createElement("option");
      opcion.value = categoria.id;
      opcion.textContent = categoria.nombre;
      $selectCategoria.append(opcion);
    }
  }).catch(() => mostrarMensaje("error", "No se pudieron cargar las categorías."));

  $form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if ($btnGuardar.disabled) return;

    $form.querySelectorAll("[data-error]").forEach((elemento) => { elemento.textContent = ""; });
    $form.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));

    const datos = Object.fromEntries(new FormData($form));
    datos.categoria_id = datos.categoria_id === "" ? null : Number(datos.categoria_id);
    datos.costo_interno = datos.costo_interno === "" ? null : Number(datos.costo_interno);

    const textoOriginal = $btnGuardar.textContent;
    $btnGuardar.disabled = true;
    $btnGuardar.textContent = "Guardando…";

    try {
      const { data } = await crearEquipo(datos);
      $form.reset();
      mostrarMensaje("exito", `Equipo ${data.codigo} registrado.`);
      await alGuardar();
    } catch (error) {
      if (error.status === 422) {
        for (const [campo, mensajes] of Object.entries(error.datos.errors ?? {})) {
          const parrafo = Array.from($form.querySelectorAll("[data-error]"))
            .find((elemento) => elemento.dataset.error === campo);
          if (parrafo) parrafo.textContent = mensajes[0];
          $form.elements.namedItem(campo)?.setAttribute("aria-invalid", "true");
        }
        $form.querySelector('[aria-invalid="true"]')?.focus();
      } else {
        mostrarMensaje("error", error.name === "AbortError"
          ? "La solicitud tardó demasiado. Revise el listado antes de intentar nuevamente."
          : "No se pudo guardar el equipo. Intente nuevamente.");
      }
    } finally {
      $btnGuardar.disabled = false;
      $btnGuardar.textContent = textoOriginal;
    }
  });
};
