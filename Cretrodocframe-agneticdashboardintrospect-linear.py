import requests
import json

api_key = "lin_api_trpwR9HLGMLgwFyppvafSHCCEV0TFayA3pYzXSC5"
endpoint = "https://api.linear.app/graphql"

# First introspection query to get all mutations
introspection_query = {
    "query": """
    {
      __schema {
        mutationType {
          fields(includeDeprecated: false) {
            name
            args {
              name
              type {
                name
                kind
                ofType { name kind }
              }
            }
          }
        }
      }
    }
    """
}

headers = {
    "Authorization": api_key,
    "Content-Type": "application/json"
}

print("Fetching all mutations...")
response = requests.post(endpoint, json=introspection_query, headers=headers)
data = response.json()

if "errors" in data:
    print("Error:", data["errors"])
else:
    # Get all mutations
    mutations = data.get("data", {}).get("__schema", {}).get("mutationType", {}).get("fields", [])
    
    # Filter for invite-related mutations
    invite_mutations = [m for m in mutations if "invite" in m["name"].lower()]
    
    print(f"\nFound {len(invite_mutations)} invite-related mutations:")
    for mutation in invite_mutations:
        print(f"\nMutation: {mutation['name']}")
        print(f"Arguments:")
        for arg in mutation.get("args", []):
            arg_type = arg["type"]
            if arg_type["kind"] == "NON_NULL":
                type_str = f"{arg_type['ofType']['name']}!"
            else:
                type_str = arg_type["name"] or arg_type.get("ofType", {}).get("name", "Unknown")
            print(f"  - {arg['name']}: {type_str}")
    
    # Now get the input type details for organizationInviteCreate
    if any(m["name"] == "organizationInviteCreate" for m in invite_mutations):
        print("\n" + "="*60)
        print("Getting detailed input type for organizationInviteCreate...")
        
        detail_query = {
            "query": """
            {
              __type(name: "OrganizationInviteCreateInput") {
                name
                kind
                inputFields {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                      ofType { name kind }
                    }
                  }
                  isDeprecated
                  deprecationReason
                }
              }
            }
            """
        }
        
        detail_response = requests.post(endpoint, json=detail_query, headers=headers)
        detail_data = detail_response.json()
        
        if "errors" in detail_data:
            print("Error fetching input type:", detail_data["errors"])
        else:
            input_type = detail_data.get("data", {}).get("__type", {})
            if input_type:
                print(f"\nInput Type: {input_type['name']}")
                print("Input Fields:")
                for field in input_type.get("inputFields", []):
                    field_type = field["type"]
                    # Resolve the type name
                    if field_type["kind"] == "NON_NULL":
                        type_str = f"{field_type['ofType'].get('name') or field_type['ofType'].get('ofType', {}).get('name', 'Unknown')}!"
                    else:
                        type_str = field_type.get("name") or field_type.get("ofType", {}).get("name", "Unknown")
                    print(f"  - {field['name']}: {type_str}")
