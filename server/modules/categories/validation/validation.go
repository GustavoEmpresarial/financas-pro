// Package validation valida a entrada do modulo categories.
package validation

import (
	"financaspro/server/shared/crud"
	"financaspro/server/shared/validate"
)

// defaultColor e defaultIcon replicam os defaults do legado
// (modules/categories/routes.ts): `color ?? "#64748b"`, `icon ?? "tag"`.
const (
	defaultColor = "#64748b"
	defaultIcon  = "tag"
)

func Create(b *crud.Body) error {
	body := validate.Body(*b)
	if err := validate.First(
		validate.Required(body, "name", "Nome"),
		validate.Required(body, "type", "Tipo"),
		validate.OneOf(body, "type", "Tipo", "income", "expense"),
	); err != nil {
		return err
	}
	validate.Default(body, "color", defaultColor)
	validate.Default(body, "icon", defaultIcon)
	validate.Default(body, "isDefault", false)
	return nil
}

func Update(b *crud.Body) error {
	body := validate.Body(*b)
	validate.Trim(body, "name")
	return validate.OneOf(body, "type", "Tipo", "income", "expense")
}
