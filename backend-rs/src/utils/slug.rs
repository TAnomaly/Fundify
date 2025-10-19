pub fn slugify(value: &str) -> String {
    let mut slug = String::with_capacity(value.len());
    let mut previous_dash = false;

    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            previous_dash = false;
        } else if ch.is_ascii_whitespace() || matches!(ch, '-' | '_' | '+') {
            if !previous_dash && !slug.is_empty() {
                slug.push('-');
                previous_dash = true;
            }
        }
    }

    while slug.ends_with('-') {
        slug.pop();
    }

    slug
}
