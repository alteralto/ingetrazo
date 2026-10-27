#version 330 core
// Edge-aware blur of the occlusion (#954): averages a 4x4 block, but only
// texels whose depth is close to this one's, so the dark band of a corner
// never bleeds across the silhouette onto the object in front or the sky.
uniform sampler2D u_ao;
uniform sampler2D u_depth;
uniform vec2 u_texel;           // 1 / occlusion texture size
uniform mat4 u_inv_proj;
uniform float u_radius;

in vec2 v_uv;
out vec4 fragColor;

float view_z(vec2 uv) {
    float d = texture(u_depth, uv).r;
    vec4 p = u_inv_proj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    return p.z / p.w;
}

void main() {
    // Same alignment as ao.frag: this pass is half size too, so its centre
    // sits on a full-size depth texel corner (u_texel here is the HALF-size
    // one, hence a quarter). Without it the depth test that keeps the blur
    // from crossing a silhouette reads the wrong side of the step.
    vec2 uv0 = v_uv + u_texel * 0.25;
    float z0 = view_z(uv0);
    float sum = 0.0;
    float wsum = 0.0;
    for (int y = -2; y < 2; ++y) {
        for (int x = -2; x < 2; ++x) {
            vec2 uv = uv0 + (vec2(float(x), float(y)) + 0.5) * u_texel;
            float w = abs(view_z(uv) - z0) < u_radius * 0.5 ? 1.0 : 0.0;
            sum += texture(u_ao, uv).r * w;
            wsum += w;
        }
    }
    float ao = wsum > 0.0 ? sum / wsum : texture(u_ao, uv0).r;
    fragColor = vec4(vec3(ao), 1.0);
}
