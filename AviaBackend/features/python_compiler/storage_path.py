def tenant_prefix(client_slug: str, project_slug: str) -> str:
    return f"{client_slug.strip()}/{project_slug.strip()}"


def build_ai_created_cell_output_prefix(client_slug: str, project_slug: str, cell_id: str, execution_id: str) -> str:
    return f"{tenant_prefix(client_slug, project_slug)}/ai_created/{cell_id}/{execution_id}"
