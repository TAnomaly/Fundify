use heck::ToKebabCase;

pub fn slugify(input: &str) -> String {
    input.trim().to_kebab_case()
}
