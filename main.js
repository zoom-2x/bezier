// ----------------------------------------------------------------------------------
// -- BEZIER CURVE STUDY.
// ----------------------------------------------------------------------------------

$(function()
{
    var WIDTH = 800;
    var HEIGHT = 500;
    var point = [0, 0];

    var PROP_OFFSET = 0;
    var PROP_POSITION_X = 1;
    var PROP_POSITION_Y = 2;
    var PROP_ROTATION = 3;
    var PROP_SCALING_X = 4;
    var PROP_SCALING_Y = 5;
    var PROP_COUNT = 6;

    var STATE_RUN = 1;
    var STATE_PAUSE = 2;
    var STATE_STOP = 3;

    var EASING_OFF = 1;
    var EASING_IN = 2;
    var EASING_OUT = 3;

    var prop_name = [
        { name: 'Offset', description: '[0, 1]', id: 'offset' },
        { name: 'Position X', description: '', id: 'position_x' },
        { name: 'Position Y', description: '', id: 'position_y' },
        { name: 'Rotation', description: 'degrees', id: 'rotation' },
        { name: 'Scaling X', description: '', id: 'scaling_x' },
        { name: 'Scaling Y', description: '', id: 'scaling_y' }
    ];

    var bezier_screen = document.getElementById('bezier_screen');
    var bezier_ctx = bezier_screen.getContext('2d');

    var bezier_first_derivative_screen = document.getElementById('bezier_first_derivative_screen');
    var bezier_first_derivative_ctx = bezier_first_derivative_screen.getContext('2d');

    var bezier_second_derivative_screen = document.getElementById('bezier_second_derivative_screen');
    var bezier_second_derivative_ctx = bezier_second_derivative_screen.getContext('2d');

    bezier_screen.width = WIDTH;
    bezier_screen.height = HEIGHT;

    bezier_first_derivative_screen.width = WIDTH;
    bezier_first_derivative_screen.height = HEIGHT;

    bezier_second_derivative_screen.width = WIDTH;
    bezier_second_derivative_screen.height = HEIGHT;

    var selected_point = false;
    var moving = false;
    var prev_timestamp = 0;

    var graph_settings =
    {
        point_inner_radius: 3,
        point_outer_radius: 8,
        point_mid_inner_radius: 3,
        point_mid_outer_radius: 7,
        point_inner_color: '#fff',
        point_outer_color: 'rgb(141, 73, 131)',
        point_mid_inner_color: '#fff',
        point_mid_outer_color: 'rgb(173, 107, 113)',
        point_selected_color: 'rgb(224, 108, 117)',
        control_inner_color: '#fff',
        control_outer_color: 'rgb(156, 143, 158)',

        line_width: 4,
        line_color: 'rgb(0, 128, 192)',

        point_inner_radius_lut: 2,
        point_outer_radius_lut: 4,
        point_inner_color_lut: '#fff',
        point_outer_color_lut: 'rgb(255, 128, 192)',

        line_width_lut: 2,
        line_color_lut: 'rgb(148, 233, 63)',

        grid_tick: 50,
        grid_offset_x: 0,
        grid_offset_y: 0,

        control_tangent_width: 1,
        control_tangent_color: 'rgb(66, 167, 179)',

        tangent_color: 'rgb(255, 45, 45)',
        tangent_width: 3,
        tangent_arrow_fill: true,
        tangent_arrow_size: 12,
        tangent_scale: 0.2,

        inter_point_radius: 3,
        inter_line_width: 2,
        inter_point_color: 'rgb(0, 99, 147)',

        debug_mode: false
    };

    graph_settings.grid_offset_x = Math.floor(WIDTH / 2);
    graph_settings.grid_offset_y = Math.floor(HEIGHT / 2);

    // ----------------------------------------------------------------------------------
    // -- Settings panel.
    // ----------------------------------------------------------------------------------

    function init_bezier_settings_panel(curve)
    {
        $('input#moving_points_count').val(curve.moving_points_count);
        $('input#inter_point_speed').val(curve.speed_ms);
        $('input#arclen_samples').val(curve.lut_samples);
        $('input#tangent_width').val(graph_settings.tangent_width);
        $('input#tangent_arrow_size').val(graph_settings.tangent_arrow_size);

        if (curve.edit_mode)
        {
            $('input#edit_mode').prop('checked', true);
            update_temp_points();
        }
        else
            $('input#edit_mode').prop('checked', false);

        if (curve.animate_points)
            $('input#animate_points').prop('checked', true);
        else
            $('input#animate_points').prop('checked', false);

        if (curve.show_animation)
            $('input#show_animation').prop('checked', true);
        else
            $('input#show_animation').prop('checked', false);

        if (curve.sync_movement)
            $('input#sync_movement').prop('checked', true);
        else
            $('input#sync_movement').prop('checked', false);

        if (curve.show_controls)
            $('input#show_controls').prop('checked', true);
        else
            $('input#show_controls').prop('checked', false);

        if (curve.show_tangent)
            $('input#show_tangent').prop('checked', true);
        else
            $('input#show_tangent').prop('checked', false);

        if (curve.show_lut)
            $('input#arclen_lut').prop('checked', true);
        else
            $('input#arclen_lut').prop('checked', false);

        if (graph_settings.arrow_fill)
            $('input#arrow_fill').prop('checked', true);
        else
            $('input#arrow_fill').prop('checked', false);

        if (graph_settings.debug_mode)
            $('input#debug_mode').prop('checked', true);
        else
            $('input#debug_mode').prop('checked', false);

        if (curve.keyframes_mode)
        {
            $('input#keyframes_mode').prop('checked', true);
            new bootstrap.Collapse($('#keyframe-editor'));
        }
        else
            $('input#keyframes_mode').prop('checked', false);

        // ----------------------------------------------------------------------------------
        // -- Get the settings.
        // ----------------------------------------------------------------------------------

        $('#bezier').on('keyup', 'input#moving_points_count', function(e)
        {
            var $target = $(e.target);
            bezier_curve.moving_points_count = Math.floor($target.val());
            bezier_init_moving_points(bezier_curve);
        });

        $('#bezier').on('keyup', 'input#inter_point_speed', function(e)
        {
            var $target = $(e.target);
            bezier_curve.speed_ms = Math.floor($target.val());
            // update_bezier(bezier_curve);
        });

        $('#bezier').on('keyup', 'input#arclen_samples', function(e)
        {
            var $target = $(e.target);
            var v = Math.floor($target.val());

            if (v)
            {
                bezier_curve.lut_samples = v;
                bezier_update_bezier_lut(bezier_curve);
            }
        });

        $('#bezier').on('keyup', 'input#tangent_width', function(e)
        {
            var $target = $(e.target);
            graph_settings.tangent_width = Math.floor($target.val());
        });

        $('#bezier').on('keyup', 'input#tangent_arrow_size', function(e)
        {
            var $target = $(e.target);
            graph_settings.tangent_arrow_size = Math.floor($target.val());
        });

        $('#bezier').on('click', 'input#clear_curve', function(e)
        {
            bezier_clear(bezier_curve);
            update_temp_points();
        });

        $('#bezier').on('change', 'input#total_frames', function(e)
        {
            var $target = $(e.target);
            animation_change_frames(parseInt($target.val()));
        });

        $('#bezier').on('change', 'input#edit_mode', function(e)
        {
            var $target = $(e.target);
            bezier_curve.edit_mode = $target.prop('checked');
            update_temp_points();
        });

        $('#bezier').on('change', 'input#animate_points', function(e)
        {
            var $target = $(e.target);
            curve.animate_points = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#keyframes_mode', function(e)
        {
            var $target = $(e.target);
            curve.keyframes_mode = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#show_controls', function(e)
        {
            var $target = $(e.target);
            curve.show_controls = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#show_tangent', function(e)
        {
            var $target = $(e.target);
            curve.show_tangent = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#arrow_fill', function(e)
        {
            var $target = $(e.target);
            graph_settings.tangent_arrow_fill = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#debug_mode', function(e)
        {
            var $target = $(e.target);
            graph_settings.debug_mode = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#arclen_lut', function(e)
        {
            var $target = $(e.target);
            curve.show_lut = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#sync_movement', function(e)
        {
            var $target = $(e.target);
            curve.sync_movement = $target.prop('checked');
        });

        $('#bezier').on('change', 'input#animate_moving_object', function(e)
        {
            var $target = $(e.target);
            curve.animate_moving_object = $target.prop('checked');
        });
    };

    // ----------------------------------------------------------------------------------
    // -- Keyframe editor.
    // ---------------------------------------------------------------------------------

    $('#keyframe-editor').on('mousedown', '#keyframe-slider input', function(e)
    {
        var $target = $(e.target);
        $target.addClass('active');
        var frame = parseInt($target.val());
        $target.data('current', frame);

        ke_update_frame(frame);
    });

    $('#keyframe-editor').on('change', '#keyframe-slider input', function(e)
    {
        var $target = $(e.target);
        var frame = parseInt($target.val());
        $target.data('current', frame);

        ke_update_frame(frame);
    });

    $('body, #keyframe-editor').on('mouseup', '#keyframe-slider input', function(e)
    {
        var $target = $(e.target);
        $target.removeClass('active');
    });

    $('#keyframe-editor').on('mousemove', '#keyframe-slider input', function(e)
    {
        var $target = $(e.target);

        if ($target.hasClass('active') && $target.data('current') != $target.val())
        {
            var frame = parseInt($target.val());
            $target.data('current', frame);
            ke_update_frame(frame);
        }
    });

    $('#keyframe-editor').on('change', 'select#object-selector', function(e)
    {
        var $target = $(e.target);
        $('#keyframe-editor').data('object-id', $target.val());
        ke_update_keyframes();

        var object = ke_current_object();
        $('#loop-animation').prop('checked', object.animation.loop);
    });

    $('#keyframe-editor').on('click', '#play-button', function(e)
    {
        for (var i = 0; i < animations.length; ++i) {
            animations[i].state = STATE_RUN;
        }
    });

    $('#keyframe-editor').on('click', '#pause-button', function(e)
    {
        for (var i = 0; i < animations.length; ++i) {
            animations[i].state = STATE_PAUSE;
        }
    });

    $('#keyframe-editor').on('click', '#rewind-button', function(e) {
        ke_update_frame(1);
    });

    $('#keyframe-editor').on('click', '#save-button', function(e) {
        var animation = ke_current_animation();
    });

    $('#keyframe-editor').on('click', 'button.new-keyframe', function(e)
    {
        var $target = $(e.target);
        var $keyframe = $target.parent();
        var type = $keyframe.parent().data('type');
        var animation = ke_current_animation();

        new_keyframe(animation, type);
        ke_update_keyframes();
    });

    $('#keyframe-editor').on('click', 'input.ke-frame', function(e)
    {
        var $target = $(e.target);
        var $keyframe = $target.parent();
        var type = $keyframe.parent().data('type');
        var animation = ke_current_animation();

        animation.frame = parseFloat($target.val());
        ke_update_frame(animation.frame);
    });

    $('#keyframe-editor').on('click', 'input.ke-value', function(e)
    {
        var $target = $(e.target);
        var $keyframe = $target.parent();
        var $frame = $keyframe.find('input.ke-frame');
        var type = $keyframe.parent().data('type');
        var animation = ke_current_animation();

        animation.frame = parseFloat($frame.val());
        ke_update_frame(animation.frame);
    });

    $('#keyframe-editor').on('click', 'a.easing', function(e)
    {
        e.preventDefault();

        var $target = $(e.target);
        var $keyframe = $target.parent().parent();
        var keyframe_index = $keyframe.index() - 1;
        var type = $keyframe.parent().data('type');
        var easing = $target.data('easing');
        var animation = ke_current_animation();

        change_keyframe_easing(animation, type, keyframe_index, easing);
        ke_update_frame(animation.frame);
        ke_update_keyframes();
    });

    $('#keyframe-editor').on('click', 'input#loop-animation', function(e)
    {
        var $target = $(e.target);
        var animation = ke_current_animation();
        animation.loop = $target.prop('checked') ? true : false;
    });

    $('#keyframe-editor').on('change', 'input.ke-frame', function(e)
    {
        var $target = $(e.target);
        var $keyframe = $target.parent();
        var keyframe_index = $keyframe.index() - 1;
        var type = $keyframe.parent().data('type');
        var animation = ke_current_animation();
        var frame = parseFloat($target.val());
        frame = animation_frame_check(animation, frame);

        change_keyframe_frame(animation, type, keyframe_index, frame);
        sort_keyframes(animation, type);
        animation.frame = frame;
        ke_update_frame(animation.frame);
        ke_update_keyframes();
    });

    $('#keyframe-editor').on('change', 'input.ke-value', function(e)
    {
        var $target = $(e.target);
        var $keyframe = $target.parent();
        var keyframe_index = $keyframe.index() - 1;
        var type = $keyframe.parent().data('type');
        var animation = ke_current_animation();
        var value = parseFloat($target.val())

        change_keyframe_value(animation, type, keyframe_index, value);
        ke_update_frame(animation.frame);
        ke_update_keyframes();

        var object = ke_current_object();
    });

    $('#keyframe-editor').on('click', 'button.delete-keyframe', function(e)
    {
        var $target = $(e.target);
        var $keyframe = $target.parent();
        var type = $keyframe.parent().data('type');
        var keyframe_index = $keyframe.index() - 1;
        var animation = ke_current_animation();

        delete_keyframe(animation, type, keyframe_index);
        ke_update_keyframes();
    });

    function ke_current_object()
    {
        var obj = false;
        var object_id = $('#keyframe-editor').data('object-id');

        if (object_id >= 0 && object_id < objects.length)
            obj = objects[object_id];

        return obj;
    };

    function ke_current_animation()
    {
        var animation = false;
        var object = ke_current_object();
        animation = object.animation;

        return animation;
    };

    function ke_current_frame()
    {
        var animation = ke_current_animation();
        return animation.frame;
    };

    function ke_update_frame(frame)
    {
        // var object = ke_current_object();

        // if (!object)
        //     return;

        for (var i = 0; i < objects.length; ++i)
        {
            if (frame < 1)
                frame = 1;

            if (frame > objects[i].animation.frames)
                frame = objects[i].animation.frames;

            objects[i].animation.frame = frame;
            update_animation_frame(objects[i]);
        }
    };

    function ke_keyframe_html(frame, value, easing)
    {
        easing = !easing || easing < EASING_OFF || easing > EASING_OUT ? EASING_OFF : easing;

        var easings = [
            {title: 'ease-in', style: 'bi-arrow-left-short', data: EASING_IN},
            {title: 'ease-out', style: 'bi-arrow-right-short', data: EASING_OUT},
            {title: 'ease-off', style: 'bi-x', data: EASING_OFF},
        ];

        html = '<li class="list-group-item">';
        html += '<input class="form-control ke-frame" title="frame" type="text" value="'+ frame +'" />';
        html += '<input class="form-control ke-value" title="value" type="text" value="'+ value +'" />';

        html += '<div class="btn-group easing">';

        for (var i = 0; i < easings.length; ++i)
        {
            var active = easing == easings[i].data ? ' active' : '';
            var style = easings[i].style + active;
            html += '<a href="#" title="'+ easings[i].title +'" class="btn btn-primary easing '+ style +'" data-easing="'+ easings[i].data +'"></a>';
        }

        html += '</div>';

        html += '<button type="button" class="btn btn-danger bi-x-circle-fill delete-keyframe"></button>';
        html += '</li>';

        return html;
    };

    function ke_init()
    {
        var $object_selector = $('#object-selector');
        var html = '';

        for (var i = 0; i < objects.length; ++i) {
            html += '<option value="'+ i +'">'+ objects[i].name + '</option>';
        }

        $object_selector.html(html);

        var object = ke_current_object();
        $('#loop-animation').prop('checked', object.animation.loop);
    };

    function ke_update_playback()
    {
        var object = ke_current_object();

        if (!object)
            return;

        $('#keyframe-range').val(object.animation.frame);
        // $('#frame_indicator').text('Frame: ' + object.animation.frame);
        $('#frame_indicator').val(object.animation.frame);
        $('#total_frames').val(object.animation.frames);
    };

    function ke_update_keyframes()
    {
        var $editor_base = $('#keyframe-editor');
        var object_id = $editor_base.data('object-id');
        var object = objects[object_id];

        if (!object || !object.animation)
            return;

        var $editor_frames = $editor_base.find('#keyframe-editor-frames');

        var props = Object.keys(object.animation.keyframes);
        var prop_html = Array(PROP_COUNT);

        // -- Default values.

        for (var i = 0; i < PROP_COUNT; ++i)
        {
            prop_html[i] = '<li class="list-group-item property-start">'+
                                              prop_name[i].name +'<span>'+
                                              prop_name[i].description +'</span></li>';

            prop_html[i] += '<li class="list-group-item">';
            prop_html[i] += '<button type="button" class="btn btn-success bi-plus-circle-fill new-keyframe"></button>';
            prop_html[i] += '</li>';

            $editor_frames.find('ul#'+ prop_name[i].id).html(prop_html[i]);
        }

        // -- Selected animation values.

        for (var i = 0; i < object.animation.keyframes.length; ++i)
        {
            var prop_keyframes = object.animation.keyframes[i];

            // Invalid interpolation property.
            if (prop_keyframes.type >= PROP_COUNT)
                continue;

            prop_html[prop_keyframes.type] = '<li class="list-group-item property-start">'+
                                              prop_name[prop_keyframes.type].name +'<span>'+
                                              prop_name[prop_keyframes.type].description +'</span></li>';

            for (var j = 0; j < prop_keyframes.frames.length; ++j)
            {
                var keyframe = prop_keyframes.frames[j];

                if (!keyframe)
                    continue;

                if ((keyframe.frame == 0 && keyframe.value != 0) ||
                    (keyframe.frame == object.animation.frames - 1 && keyframe.value != 1))
                {}
                else
                    prop_html[prop_keyframes.type] += ke_keyframe_html(keyframe.frame, keyframe.value, keyframe.easing);
            }

            prop_html[prop_keyframes.type] += '<li class="list-group-item">';
            prop_html[prop_keyframes.type] += '<button type="button" class="btn btn-success bi-plus-circle-fill new-keyframe"></button>';
            prop_html[prop_keyframes.type] += '</li>';

            $editor_frames.find('ul#'+ prop_name[prop_keyframes.type].id).html(prop_html[prop_keyframes.type]);
        }
    };

    // ----------------------------------------------------------------------------------
    // -- Bezier curve definition.
    // ----------------------------------------------------------------------------------
    // -- point structure: [[x, y], [cx1, cy1], [cx2, cy2], selected]
    // -- section structure: [[start-point-index, end-point-index, start-control-index, end-control-index], ...]
    // -- lut structure: [[distance-steps, ...], ...]
    // ----------------------------------------------------------------------------------

    var bezier_curve =
    {
        points: [],
        sections: [],
        // section_t: 0,

        lut: [],
        lut_step: 0,
        lut_samples: 5,

        mouse_over_point: false,

        moving_points: [],
        moving_points_count: 20,
        moving_points_t: 0,

        samples: 40,
        speed_ms: 5000,

        show_lut: false,
        show_controls: true,
        show_tangent: false,
        animate_points: false,
        show_animation: false,
        edit_mode: false,
        sync_movement: true,
        keyframes_mode: true
    };

    var animation_frame_count = 250;
    var target_fps = 60;
    var frame_ms = 1000 / target_fps;

    // frame rate 30fps => frame_ms = 33.33ms
    var animations = [
        // Object animation.
        {
            curve: bezier_curve,
            follow_curve: true,
            loop: false,
            ms: 5000,
            current_ms: 0,

            target_fps: target_fps,
            frame_ms: frame_ms,

            frames: animation_frame_count,
            frame: 1,

            state: STATE_PAUSE,

            keyframes: [
                {
                    type: PROP_OFFSET,
                    count: 0,
                    frames: [
                        {frame: 1, value: 0.04},
                        {frame: 43, value: 0.2},
                        {frame: 65, value: 0.276},
                        {frame: 94, value: 0.376},
                        {frame: 160, value: 0.596},
                        {frame: 185, value: 0.7},
                        {frame: 250, value: 1.0},
                    ]
                },
                {
                    type: PROP_POSITION_X,
                    count: 0,
                    frames: []
                },
                {
                    type: PROP_POSITION_Y,
                    count: 0,
                    frames: []
                },
                {
                    type: PROP_ROTATION,
                    count: 0,
                    frames: []
                },

                {
                    type: PROP_SCALING_X,
                    count: 3,
                    frames: [
                        {frame: 1, value: 1},
                        {frame: 49, value: 1},
                        {frame: 63, value: 0.7},
                        {frame: 85, value: 1},
                        {frame: 188, value: 1},
                        {frame: 216, value: 1.2},
                        {frame: 250, value: 1},
                    ]
                },
                {
                    type: PROP_SCALING_Y,
                    count: 2,
                    frames: []
                }
            ]
        },

        // Camera animation.
        {
            curve: bezier_curve,
            follow_curve: true,
            ms: 5000,
            current_ms: 0,
            loop: false,

            target_fps: target_fps,
            frame_ms: frame_ms,

            frames: animation_frame_count,
            frame: 1,

            state: STATE_PAUSE,

            keyframes: [
                {
                    type: PROP_OFFSET,
                    count: 0,
                    frames: [
                        {frame: 1, value: 0},
                        {frame: 17, value: 0.05},
                        {frame: 100, value: 0.304},
                        {frame: 210, value: 0.65},
                        {frame: 250, value: 0.8},
                    ]
                },
                {
                    type: PROP_POSITION_X,
                    count: 0,
                    frames: []
                },
                {
                    type: PROP_POSITION_Y,
                    count: 0,
                    frames: [
                        {frame: 1, value: 0},
                        {frame: 90, value: 0},
                        {frame: 150, value: 60},
                        {frame: 250, value: 0},
                    ]
                },
                {
                    type: PROP_ROTATION,
                    count: 0,
                    frames: []
                },
                {
                    type: PROP_SCALING_X,
                    count: 0,
                    frames: []
                },
                {
                    type: PROP_SCALING_Y,
                    count: 0,
                    frames: []
                },
            ]
        }
    ];

    var arrow_points = [
        [-1, -1],
        [1, -1],
        [2, 0],
        [1, 1],
        [-1, 1],
    ];

    var spaceship_points = [
        [-1, -3],
        [0, -3],
        [1, -1],
        [3, -1],
        [4, 0],
        [3, 1],
        [1, 1],
        [0, 3],
        [-1, 3],
        [-1, 2],
        [0, 0],
        [-1, -2],
    ];

    var camera_points = [
        [1, -2],
        [1, 2],
        [-1, 1],
        [-3, 1],
        [-3, -1],
        [-1, -1],
    ];

    var objects = [
        {
            name: 'Main object',

            position: [0, 0],
            rotation: 0,
            scaling: [10, 10],
            origin_offset: [14, 0],
            // origin_offset: [0, 0],
            debug: true,

            interpolated: Array(PROP_COUNT),

            forward_axis: 'x',
            animation: animations[0],

            points: arrow_points,
            line_color: 'rgb(0, 0, 0)',
            fill_color: 'rgb(0, 150, 255)',
            line_width: 3
        },

        {
            name: 'Camera',

            position: [0, 0],
            rotation: 0,
            scaling: [10, 10],
            origin_offset: [0, 0],
            debug: true,

            interpolated: Array(PROP_COUNT),
            target: 0,

            forward_axis: 'x',
            animation: animations[1],

            points: camera_points,

            line_color: 'rgb(0, 0, 0)',
            fill_color: 'rgb(0, 150, 120)',
            line_width: 3
        }
    ];

    function animation_change_frames(frame_count)
    {
        $('#keyframe-range').attr('max', frame_count);

        for (var i = 0; i < animations.length; ++i)
        {
            var animation = animations[i];
            var old_frame_count = animation.frames;

            animation.frames = frame_count;

            for (var j = 0; j < animation.keyframes.length; ++j)
            {
                var keyframes = animation.keyframes[j];

                for (var k = 0; k < keyframes.frames.length; ++k)
                {
                    if (keyframes.frames[k].frame > 1)
                    {
                        var t = keyframes.frames[k].frame / old_frame_count;
                        keyframes.frames[k].frame = Math.floor(t * frame_count);
                    }
                }
            }
        }
    };

    function animation_init()
    {
        for (var i = 0; i < animations.length; ++i)
        {
            for (var j = 0; j < animations[i].keyframes.length; ++j)
            {
                animations[i].keyframes[j].count = animations[i].keyframes[j].frames.length;

            }
        }
    }

    generate_default_curve(2);
    reset_objects();
    animation_init();
    animation_change_frames(animation_frame_count);
    ke_init();
    ke_update_playback();
    ke_update_keyframes();

    // Used when adding curve points.
    var target_points = 0;
    var temp_points = [];

    function update_temp_points()
    {
        target_points = 2;
        temp_points.length = 0;

        if (!bezier_curve.sections.length)
            target_points = 4;
    };

    function reset_objects()
    {
        for (var i = 0; i < objects.length; ++i)
        {
            objects[i].interpolated[0] = 0;
            objects[i].interpolated[1] = 0;
            objects[i].interpolated[2] = 0;
            objects[i].interpolated[3] = 0;
            objects[i].interpolated[4] = 1;
            objects[i].interpolated[5] = 1;

            if (objects[i].animation)
                update_animation_frame(objects[i]);
        }
    };

    function generate_default_curve(type)
    {
        switch (type)
        {
            case 1:
            {
                bezier_curve.points.push([[-313, -57], [-391, 173], [-235, -287], -1]);
                bezier_curve.points.push([[-234, 0], [-144, 186], [-324, -186], -1]);
                bezier_curve.points.push([[357, -1], [346, -194], [368, 192], -1]);
                bezier_curve.points.push([[-3, 146], [68, 253], [-74, 39], -1]);
                bezier_curve.points.push([[56, 109], [120, -17], [-8, 235], -1]);
                bezier_curve.points.push([[95, 103], [258, 84], [-68, 122], -1]);

                bezier_curve.sections.push([0, 1, 1, 1]);
                bezier_curve.sections.push([1, 2, 2, 1]);
                bezier_curve.sections.push([2, 3, 2, 1]);
                bezier_curve.sections.push([3, 4, 2, 1]);
                bezier_curve.sections.push([4, 5, 2, 1]);
            }
            break;

            case 2:
            {
                bezier_curve.points.push([[-288, -24], [-300, 189], [-276, -237]]);
                bezier_curve.points.push([[-86, 77], [-186, 205], [14, -51]]);
                bezier_curve.points.push([[118, 92], [9, 111], [227, 73]]);
                bezier_curve.points.push([[229, -127], [397, -109], [61, -145]]);
                bezier_curve.points.push([[-144, -164], [-24, 131], [-264, -459]]);

                bezier_curve.sections.push([0, 1, 1, 1]);
                bezier_curve.sections.push([1, 2, 2, 1]);
                bezier_curve.sections.push([2, 3, 2, 1]);
                bezier_curve.sections.push([3, 4, 2, 1]);
            }
            break;

            case 3:
            {
                bezier_curve.points.push([[-283, -101], [-162, 102], [-404, -304], -1]);
                bezier_curve.points.push([[-26, -23], [-91, -175], [39, 129], -1]);
                bezier_curve.points.push([[249, 25], [359, -170], [139, 220], -1]);

                bezier_curve.sections.push([0, 1, 1, 1]);
                bezier_curve.sections.push([1, 2, 2, 1]);
            }
            break;
        }

        bezier_init_moving_points(bezier_curve);
        bezier_update_bezier_lut(bezier_curve);
    };

    function clamp(v, min, max)
    {
        v = v <= min ? min : v;
        v = v >= max ? max : v;

        return v;
    };

    // t global [0, 1].
    function bezier_tg(curve, tc)
    {
        var t = tc / curve.sections.length;
        t = clamp(t, 0, 1);

        return t;
    };

    // t curve [0, max].
    function bezier_tc(curve, tg)
    {
        var t = tg * curve.sections.length;
        t = clamp(t, 0, curve.sections.length);

        return t;
    };

    // t local [0, 1].
    function bezier_tl(curve, tc)
    {
        var t = tc - Math.floor(tc);
        t = t < 0 ? 0 : t;
        t = (tc >= curve.sections.length) ? 1 : t;

        return t;
    };

    function bezier_sync_to_lut_from_tg(curve, tg)
    {
        if (!curve.lut.length)
            return 0;

        var t = tg;

        tg = clamp(tg, 0, 1);

        var arclen = curve.lut[curve.lut.length - 1][0];
        var search_dist = tg * arclen;

        // Binary search maybe ?
        for (var i = 0; i < curve.lut.length - 1; ++i)
        {
            var prev = curve.lut[i];
            var next = curve.lut[i + 1];

            if (search_dist >= prev[0] && search_dist < next[0])
            {
                var t_local = (search_dist - prev[0]) / (next[0] - prev[0]);
                t = (1 - t_local) * prev[1] + t_local * next[1];

                break;
            }
        }

        return t;
    };

    function bezier_section(curve, tc)
    {
        var section_index = Math.floor(tc);
        section_index = section_index >= curve.sections.length ? curve.sections.length - 1 : section_index;

        return section_index;
    };

    function bezier_compute_point(curve, tc)
    {
        var point = [0, 0];
        var section_points = bezier_section_points(curve, bezier_section(curve, tc));
        var t = bezier_tl(curve, tc);

        var a = 1 - t;
        var t1 = a * a * a;
        var t2 = 3 * t * a * a;
        var t3 = 3 * t * t * a;
        var t4 = t * t * t;

        point[0] = t1 * section_points[0][0] +
                   t2 * section_points[1][0] +
                   t3 * section_points[2][0] +
                   t4 * section_points[3][0];

        point[1] = t1 * section_points[0][1] +
                   t2 * section_points[1][1] +
                   t3 * section_points[2][1] +
                   t4 * section_points[3][1];

        return point;
    };

    function bezier_compute_first_derivative_point(curve, tc)
    {
        var point = [0, 0];
        var section_points = bezier_section_points(curve, bezier_section(curve, tc));
        var t = bezier_tl(curve, tc);

        var t1 = -3 * t * t + 6 * t - 3;
        var t2 = 9 * t * t - 12 * t + 3;
        var t3 = -9 * t * t + 6 * t;
        var t4 = 3 * t * t;

        point[0] = t1 * section_points[0][0] +
                   t2 * section_points[1][0] +
                   t3 * section_points[2][0] +
                   t4 * section_points[3][0];

        point[1] = t1 * section_points[0][1] +
                   t2 * section_points[1][1] +
                   t3 * section_points[2][1] +
                   t4 * section_points[3][1];

        return point;
    };

    function bezier_compute_second_derivative_point(curve, section_index, t)
    {
        var point = [0, 0];
        var section_points = bezier_section_points(curve, section_index);

        var t1 = -6 * t + 6;
        var t2 = 18 * t - 12;
        var t3 = -18 * t + 6;
        var t4 = 6 * t;

        point[0] = t1 * section_points[0][0] +
                   t2 * section_points[1][0] +
                   t3 * section_points[2][0] +
                   t4 * section_points[3][0];

        point[1] = t1 * section_points[0][1] +
                   t2 * section_points[1][1] +
                   t3 * section_points[2][1] +
                   t4 * section_points[3][1];

        return point;
    };

    function bezier_init_moving_points(curve)
    {
        curve.moving_tangent_section = 0;
        curve.moving_points.length = 0;
        var step = 1 / curve.moving_points_count;

        // Spread the moving points along the entire curve.
        // Store the parameter t for each point.

        for (var j = 0; j < curve.moving_points_count; ++j) {
            curve.moving_points.push(j * step);
        }
    };

    function bezier_update_bezier_lut(curve)
    {
        // start and end points
        curve.lut.length = 0;
        curve.lut_total_samples = curve.sections.length * curve.lut_samples;
        curve.lut_step = 1 / (curve.lut_total_samples - 1);

        var prev_point = [0, 0];

        for (var i = 0; i < curve.lut_total_samples; ++i)
        {
            var tg = i * curve.lut_step;
            var tc = bezier_tc(curve, tg);
            var point = bezier_compute_point(curve, tc);

            if (i == 0) {
                curve.lut.push([0, tg]);
            }
            else
            {
                var v = vec_subtract(point, prev_point);
                curve.lut.push([curve.lut[i - 1][0] + vec_len(v), tg]);
            }

            prev_point = point;
        }

        update_point_info_label(curve);
    };

    function bezier_update_moving_points(curve, tg)
    {
        for (var j = 0; j < curve.moving_points_count; ++j)
        {
            curve.moving_points[j] += tg;

            // The point has reached the end of the curve.
            if (curve.moving_points[j] >= 1)
                curve.moving_points[j] = curve.moving_points[j] - Math.floor(curve.moving_points[j]);
        }
    };

    // Return the points of a specified section.
    function bezier_section_points(curve, section_index)
    {
        if (!curve.sections.length || !curve.points.length)
            return [];

        if ((section_index != 0 && !section_index) || section_index >= curve.sections.length)
            debugger;

        var start_index = curve.sections[section_index][0];
        var end_index = curve.sections[section_index][1];
        var start_control_index = curve.sections[section_index][2];
        var end_control_index = curve.sections[section_index][3];

        var res = [
            curve.points[start_index][0],
            curve.points[start_index][start_control_index],
            curve.points[end_index][end_control_index],
            curve.points[end_index][0]
        ];

        return res;
    };

    // First point is the base point and the next is the control point.
    function bezier_add_point(curve, point, control_point)
    {
        // base_point, control_point_0, control_point_1, selected_index
        var p = [[0, 0], [0, 0], [0, 0], -1];

        p[0][0] = point[0];
        p[0][1] = point[1];

        p[1][0] = control_point[0];
        p[1][1] = control_point[1];

        // Compute the other control point so that we have C1 continuity.
        var v = vec_subtract(p[0], vec_subtract(p[1], p[0]));

        p[2][0] = v[0];
        p[2][1] = v[1];

        curve.points.push(p);
        bezier_append_section(curve);
    };

    function bezier_remove_section(curve)
    {
        // TODO(gabic):
        update_point_info_label(curve);
    };

    function bezier_clear(curve)
    {
        curve.points.length = 0;
        curve.sections.length = 0;
        curve.sections_t = 0;
        curve.lut.length = 0;
        curve.lut_stepts = 0;

        curve.moving_points.length = 0;
    };

    function bezier_append_section(curve)
    {
        if (!curve.points.length || curve.points.length == 1)
            return;

        // First section.
        if (curve.points.length == 2)
        {
            var s = [0, 0, 0, 0];

            s[0] = 0;
            s[1] = 1;
            s[2] = 1;
            s[3] = 1;

            curve.sections.push(s);
        }
        else
        {
            // Append the section to the last one.
            var last_section = curve.sections[curve.sections.length - 1];
            var s = [0, 0, 0, 0];

            var last_point_index = last_section[1];
            var last_control_point_index = last_section[3] + 1 > 2 ? 1 : 2;

            s[0] = last_point_index;
            s[1] = curve.points.length - 1;
            s[2] = last_control_point_index;
            s[3] = 1;

            curve.sections.push(s);
        }

        // curve.section_t = 1 / curve.sections.length;

        update_point_info_label(curve);
        bezier_init_moving_points(curve);
        bezier_update_bezier_lut(curve);
    };

    // Move the selected point of the given curve.
    function bezier_move_point(curve, screen_point)
    {
        for (var i = 0; i < curve.points.length; ++i)
        {
            var p = curve.points[i];
            var selected_index = p[3];

            if (selected_index >= 0)
            {
                var base_v = vec_subtract(p[1], p[selected_index]);

                p[selected_index][0] = screen_point[0];
                p[selected_index][1] = screen_point[1];

                // -- Synchronize the control points.

                if (selected_index > 0)
                {
                    var other_index = selected_index + 1 > 2 ? 1 : 2;
                    var op = vec_subtract(p[0], vec_subtract(p[selected_index], p[0]));

                    p[other_index][0] = op[0];
                    p[other_index][1] = op[1];
                }
                else
                {
                    var t1 = vec_add(p[0], base_v);
                    var t2 = vec_subtract(p[0], base_v);

                    p[1][0] = t1[0];
                    p[1][1] = t1[1];

                    p[2][0] = t2[0];
                    p[2][1] = t2[1];
                }

                bezier_update_bezier_lut(curve);
                update_point_info_label(curve);
            }
        }
    };

    function bezier_open()
    {};

    function bezier_close()
    {}

    // ----------------------------------------------------------------------------------

    init_bezier_settings_panel(bezier_curve);
    update_point_info_label(bezier_curve);

    // ----------------------------------------------------------------------------------
    // -- Helper functions.
    // ----------------------------------------------------------------------------------

    function point_offset(p)
    {
        var res = [0, 0];

        res[0] = p[0] - graph_settings.grid_offset_x;
        res[1] = p[1] - graph_settings.grid_offset_y;

        return res;
    };

    function point_to_screen(p)
    {
        var res = [0, 0];

        res[0] = p[0] + graph_settings.grid_offset_x;
        res[1] = p[1] + graph_settings.grid_offset_y;

        return res;
    }

    var r2d = 57.2957795130823208768;
    var d2r = 0.01745329251994329577;

    function rad2deg(v) {
        // return v * (180 / Math.PI);
        return v * r2d;
    };

    function deg2rad(v) {
        // return v * (Math.PI / 180);
        return v * d2r;
    };

    function vector_to_angle_x(v)
    {
        vec_normalize(v);

        var cos = vec_dot(v, [1, 0]);
        var sin = - v[0] * 0 + v[1] * 1;
        var angle = Math.atan2(sin, cos);

        return rad2deg(angle);
    };

    function vector_to_angle_vector(v, ref_v)
    {
        vec_normalize(v);
        vec_normalize(ref_v);

        var cos = vec_dot(v, ref_v);
        // Dot product between the checked vector and the perpendicular
        // to the reference vector.
        var sin = - v[0] * ref_v[1] + v[1] * ref_v[0];
        var angle = Math.atan2(sin, cos);

        return rad2deg(angle);
    };

    function translate(p, t)
    {
        var point = [0, 0];

        point[0] = p[0] + t[0];
        point[1] = p[1] + t[1];

        return point;
    };

    /**
     * @param vector p
     * @param float angle Radians.
     */
    function rotate(p, angle)
    {
        var point = [0, 0];

        var s = Math.sin(angle);
        var c = Math.cos(angle);

        point[0] = p[0] * c - p[1] * s;
        point[1] = p[0] * s + p[1] * c;

        return point;
    };

    function rotate_around_point(p, angle, origin)
    {
        var point = [0, 0];

        var s = Math.sin(angle);
        var c = Math.cos(angle);

        var r1 = c;
        var r2 = -s;
        var r3 = s;
        var r4 = c;

        point[0] = r1 * p[0] + r2 * p[1] + origin[0] * (1 - r1) - origin[1] * r2;
        point[1] = r3 * p[0] + r4 * p[1] - origin[0] * r3 + origin[1] * (1 - r4);

        // point = vec_subtract(p, origin);
        // point = rotate(point, angle);
        // point = vec_add(point, origin);

        return point;
    };

    function scale(p, scale)
    {
        var point = [0, 0];

        point[0] = p[0] * scale[0];
        point[1] = p[1] * scale[1];

        return point;
    };

    function transform(p, t, r, s) {
        return translate(rotate(scale(p, s), r), t);
    };

    function update_point_info_label(curve)
    {
        var html_left = '';
        var html_right = '';

        if (curve.points.length)
            html_left += '<strong class="heading">Points:</strong>';

        for (var i = 0; i < curve.points.length; ++i)
        {
            var point = curve.points[i];

            html_left += '<div>';

            html_left += '<span>P'+ (i + 1) +'</span> ';
            html_left += '{ ' + point[0][0] + ', ' + point[0][1] + ' } &nbsp; ';
            html_left += '<span>C'+ (i + 1) +'1</span> ';
            html_left += '{ ' + point[1][0] + ', ' + point[1][1] + ' } &nbsp; ';
            html_left += '<span>C'+ (i + 1) +'2</span> ';
            html_left += '{ ' + point[2][0] + ', ' + point[2][1] + ' } &nbsp; ';

            html_left += '</div>';
        }

        if (curve.sections.length)
            html_right += '<strong class="heading">Sections:</strong>';

        for (var i = 0; i < curve.sections.length; ++i)
        {
            var section = curve.sections[i];
            var s = [
                'P' + (section[0] + 1),
                'P' + (section[1] + 1),
                'C' + (section[0] + 1) + '' + section[2],
                'C' + (section[1] + 1) + '' + section[3]
            ];

            html_right += '<div>';
            html_right += '<span>S'+ (i + 1) +'</span> ';
            html_right += '{ '+ s.join(', ') +' }';
            html_right += '</div>';
        }

        if (curve.lut.length)
            html_right += '<div><span>Curve length</span>: '+ curve.lut[curve.lut.length - 1][0].toFixed(2) +'</div>';

        $('#console .text_left').html(html_left);
        $('#console .text_right').html(html_right);
    };

    // Verify if the mouse is over a control point.
    function check_mouse_over_point(curve, screen_point, threshold_radius)
    {
        curve.mouse_over_point = false;
        var threshold_radius = graph_settings.point_outer_radius * graph_settings.point_outer_radius;

        for (var i = 0; i < curve.points.length; ++i)
        {
            var p = curve.points[i];
            p[3] = -1;

            // Check the base point and the attached control points.
            for (var j = 0; j < 3; ++j)
            {
                if (!curve.show_controls && j > 0)
                    continue;

                var x = screen_point[0] - p[j][0];
                var y = screen_point[1] - p[j][1];

                var check = x * x + y * y;

                if (!curve.mouse_over_point && check <= threshold_radius)
                {
                    p[3] = j;
                    curve.mouse_over_point = true;
                }
            }
        }
    };

    // ----------------------------------------------------------------------------------
    // -- Event listeners.
    // ----------------------------------------------------------------------------------

    function get_screen_point(screen, event)
    {
        var rect = screen.getBoundingClientRect();
        var point = [0, 0];

        point[0] = Math.floor(event.clientX - rect.left);
        point[1] = Math.floor(event.clientY - rect.top);

        return point;
    };

    bezier_screen.addEventListener('mousemove', function(event)
    {
        var point = get_screen_point(bezier_screen, event);
        point = point_offset(point);

        if (moving)
            bezier_move_point(bezier_curve, point);
        else
            check_mouse_over_point(bezier_curve, point);
    });

    bezier_screen.addEventListener('click', function(event)
    {
        var point = get_screen_point(bezier_screen, event);

        if (bezier_curve.edit_mode)
        {
            temp_points.push(point);

            if (temp_points.length == target_points)
            {
                if (target_points == 2) {
                    bezier_add_point(bezier_curve, point_offset(temp_points[0]), point_offset(temp_points[1]));
                }
                else if (target_points == 4)
                {
                    bezier_add_point(bezier_curve, point_offset(temp_points[0]), point_offset(temp_points[1]));
                    bezier_add_point(bezier_curve, point_offset(temp_points[2]), point_offset(temp_points[3]));
                }

                target_points = 2;
                temp_points.length = 0;
            }
        }
    });

    bezier_screen.addEventListener('mousedown', function(event) {
        moving = true;
    });

    bezier_screen.addEventListener('mouseup', function(event) {
        moving = false;
    });

    // ----------------------------------------------------------------------------------
    // -- Vector math.
    // ----------------------------------------------------------------------------------

    function vec_add(v1, v2)
    {
        var res = [0, 0];

        res[0] = v1[0] + v2[0];
        res[1] = v1[1] + v2[1];

        return res;
    };

    function vec_subtract(v1, v2)
    {
        var res = [0, 0];

        res[0] = v1[0] - v2[0];
        res[1] = v1[1] - v2[1];

        return res;
    };

    function vec_inverse(v)
    {
        var res = [0, 0];

        res[0] = -v[0];
        res[1] = -v[1];

        return res;
    };

    function vec_muls(v, s)
    {
        var res = [0, 0];

        res[0] = v[0] *s;
        res[1] = v[1] *s;

        return res;
    };

    function vec_dot(v1, v2)
    {
        var res = v1[0] * v2[0] + v1[1] * v2[1];
        return res;
    };

    function vec_len(v)
    {
        var res = Math.sqrt(vec_dot(v, v));
        return res;
    };

    function vec_normalize(v)
    {
        var t = 1 / vec_len(v);

        v[0] *= t;
        v[1] *= t;

        return v;
    };

    function vec_perp(v)
    {
        // Clockwise on an inverted y axis.
        var res = [-v[1], v[0]];
        return res;
    };

    // ----------------------------------------------------------------------------------
    // -- Drawing functions.
    // ----------------------------------------------------------------------------------

    function draw_point(ctx, point, outer_color, inner_color, outer_radius, inner_radius, selected)
    {
        ctx.save();
        ctx.fillStyle = outer_color;

        if (selected)
        {
            outer_radius += 2;
            ctx.fillStyle = graph_settings.point_selected_color;
        }

        ctx.beginPath();
        ctx.arc(point[0], point[1], outer_radius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = inner_color;

        if (selected)
            ctx.fillStyle = '#fff';

        ctx.beginPath();
        ctx.arc(point[0], point[1], inner_radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    };

    function draw_curve_base_point(ctx, point, selected)
    {
        draw_point(ctx, point,
                   graph_settings.point_outer_color,
                   graph_settings.point_inner_color,
                   graph_settings.point_outer_radius,
                   graph_settings.point_inner_radius,
                   selected);
    };

    function draw_curve_control_point(ctx, point, selected)
    {
        draw_point(ctx, point,
                   graph_settings.control_outer_color,
                   graph_settings.control_inner_color,
                   graph_settings.point_outer_radius,
                   graph_settings.point_inner_radius,
                   selected);
    };

    function draw_curve_midpoint(ctx, point, selected)
    {
        draw_point(ctx, point,
                   graph_settings.point_mid_outer_color,
                   graph_settings.point_mid_inner_color,
                   graph_settings.point_mid_outer_radius,
                   graph_settings.point_mid_inner_radius,
                   selected);
    };

    function draw_debug_point(ctx, point) {
        draw_point(ctx, point_to_screen(point), 'rgb(200, 0, 200)', '#fff', 3, 2, false);
    };

    function draw_midpoint(ctx)
    {};

    function draw_grid(ctx)
    {
        var offset_x = 4;
        var offset_y = 12;

        ctx.save();

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#eee';
        ctx.setLineDash([2]);

        // -- Columns.

        for (var x = graph_settings.grid_offset_x + graph_settings.grid_tick; x < WIDTH; x += graph_settings.grid_tick)
        {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, HEIGHT);
            ctx.stroke();
        }

        for (var x = graph_settings.grid_offset_x - graph_settings.grid_tick; x >= 0; x -= graph_settings.grid_tick)
        {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, HEIGHT);
            ctx.stroke();
        }

        // -- Rows.

        for (var y = graph_settings.grid_offset_y + graph_settings.grid_tick; y < WIDTH; y += graph_settings.grid_tick)
        {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(WIDTH, y + 0.5);
            ctx.stroke();
        }

        for (var y = graph_settings.grid_offset_y - graph_settings.grid_tick; y >= 0; y -= graph_settings.grid_tick)
        {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(WIDTH, y + 0.5);
            ctx.stroke();
        }

        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([3]);

        // -- Main axis.

        ctx.beginPath();
        ctx.moveTo(graph_settings.grid_offset_x + 0.5, 0);
        ctx.lineTo(graph_settings.grid_offset_x + 0.5, HEIGHT);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, graph_settings.grid_offset_y + 0.5);
        ctx.lineTo(WIDTH, graph_settings.grid_offset_y + 0.5);
        ctx.stroke();

        // -- Ticks.

        ctx.font = "10px Tahoma";
        ctx.fillStyle = '#999';
        ctx.fillText(0, graph_settings.grid_offset_x + offset_x, graph_settings.grid_offset_y + offset_y);

        for (var x = graph_settings.grid_offset_x + graph_settings.grid_tick; x < WIDTH; x += graph_settings.grid_tick) {
            ctx.fillText(x - graph_settings.grid_offset_x, x + offset_x, graph_settings.grid_offset_y + offset_y);
        }

        for (var x = graph_settings.grid_offset_x - graph_settings.grid_tick; x >= 0; x -= graph_settings.grid_tick) {
            ctx.fillText(x - graph_settings.grid_offset_x, x + offset_x, graph_settings.grid_offset_y + offset_y);
        }

        for (var y = graph_settings.grid_offset_y + graph_settings.grid_tick; y < WIDTH; y += graph_settings.grid_tick) {
            ctx.fillText(y - graph_settings.grid_offset_y, graph_settings.grid_offset_x + offset_x, y + offset_y);
        }

        for (var y = graph_settings.grid_offset_y - graph_settings.grid_tick; y >= 0; y -= graph_settings.grid_tick) {
            ctx.fillText(y - graph_settings.grid_offset_y, graph_settings.grid_offset_x + offset_x, y + offset_y);
        }

        ctx.restore();
    };

    function update_objects(delta)
    {
        for (var i = 0; i < objects.length; ++i)
        {
            if (objects[i].animation)
                update_animation(delta, objects[i]);
        }
    };

    function ease_in_cubic(t) {
        return t * t;
        return t * t * t;
    };

    function ease_out_cubic(t)
    {
        var a = 1 - t;
        // return (1 - a * a * a);
        return (1 - a * a);
    };

    function update_animation_frame(object)
    {
        var animation = object.animation;

        for (var i = 0; i < animation.keyframes.length; ++i)
        {
            var prop_keyframes = animation.keyframes[i];

            // Invalid interpolation property.
            if (prop_keyframes.type >= PROP_COUNT)
                continue;

            for (var j = 0; j < prop_keyframes.frames.length - 1; ++j)
            {
                current = prop_keyframes.frames[j];
                next = prop_keyframes.frames[j + 1];

                if (!current || !next)
                    continue;

                if (animation.frame >= current.frame && animation.frame <= next.frame)
                {
                    if (next.frame != current.frame)
                    {
                        var t = (animation.frame - current.frame) / (next.frame - current.frame);

                        if (current.easing && current.easing == EASING_IN)
                            t = ease_in_cubic(t);
                        else if (current.easing && current.easing == EASING_OUT)
                            t = ease_out_cubic(t);

                        object.interpolated[prop_keyframes.type] = current.value * (1 - t) + next.value * t;
                    }
                    else
                        object.interpolated[prop_keyframes.type] = current.value;
                }
            }
        }

        ke_update_playback();
    };

    function valid_property_type(type)
    {
        var res = true;

        if (type < 0 || type >= PROP_COUNT)
            res = false;

        return res;
    };

    function new_keyframe(animation, type, index)
    {
        if (!valid_property_type(type))
            return;

        if (animation && animation.keyframes)
        {
            var property = animation.keyframes[type];
            var new_value = 0;

            switch (type)
            {
                case PROP_OFFSET:
                    new_value = animation.frame / animation.frames;
                break;

                case PROP_SCALING_X:
                case PROP_SCALING_Y:
                    new_value = 1;
                break;

                case PROP_ROTATION:
                    new_value = 0;
                break;
            }

            if (property.count < property.frames.length)
                property.frames[property.count] = { frame: animation.frame,  value: new_value };
            else
                property.frames.push({ frame: animation.frame, value: new_value });

            property.count++;

            sort_keyframes(animation, type);
        }
    }

    function delete_keyframe(animation, type, index)
    {
        if (!valid_property_type(type))
            return;

        if (animation && animation.keyframes)
        {
            var property = animation.keyframes[type];

            if (index < property.frames.length)
            {
                delete property.frames[index];
                property.frames.sort(function(a, b)
                {
                    if (a.frame < b.frame)
                        return -1;
                    else if (a.frame > b.frame)
                        return 1;
                    else return 0;
                });

                if (property.count > 0)
                    property.count--;
            }
        }
    };

    function animation_frame_check(animation, frame)
    {
        frame = frame <= 0 ? 1 : frame;
        frame = frame > animation.frames ? animation.frames: frame;

        return frame;
    };

    function change_keyframe_frame(animation, type, index, frame)
    {
        if (!valid_property_type(type))
            return;

        if (animation && animation.keyframes)
        {
            var property = animation.keyframes[type];

            if (index < property.frames.length)
                property.frames[index].frame = frame;
        }
    };

    function change_keyframe_value(animation, type, index, value)
    {
        if (!valid_property_type(type))
            return;

        if (animation && animation.keyframes)
        {
            var property = animation.keyframes[type];

            if (index < property.frames.length)
                property.frames[index].value = value;
        }
    };

    function change_keyframe_easing(animation, type, index, easing)
    {
        if (!valid_property_type(type))
            return;

        if (animation && animation.keyframes)
        {
            var property = animation.keyframes[type];

            if (index < property.frames.length)
                property.frames[index].easing = easing;
        }
    };

    function sort_keyframes(animation, type)
    {
        if (!valid_property_type(type))
            return;

        if (animation && animation.keyframes)
        {
            var property = animation.keyframes[type];

            property.frames.sort(function(a, b)
            {
                if (a.frame < b.frame)
                    return -1;
                else if (a.frame > b.frame)
                    return 1;
                else return 0;
            });

        }
    };

    function update_animation(delta, object)
    {
        if (!object || !object.animation ||
            object.animation.state == STATE_PAUSE || object.animation.state == STATE_STOP)
            return;

        var animation = object.animation;
        animation.current_ms += delta;

        if (animation.current_ms >= animation.frame_ms)
        {
            animation.frame++;
            animation.current_ms -= animation.frame_ms;

            update_animation_frame(object);

            if (animation.loop && animation.frame == animation.frames)
                animation.frame = 1;
        }

        // End of the animation was reached.
        if (animation.frame == animation.frames)
            animation.state = STATE_STOP;
    };

    function draw_object(ctx, obj)
    {
        if (!obj || !obj.points.length || !bezier_curve.sections.length)
            return;

        ctx.save();

        ctx.fillStyle = obj.fill_color;
        ctx.strokeStyle = obj.line_color;
        ctx.lineWidth = obj.line_width;
        ctx.lineJoin = 'mitter';

        ctx.beginPath();
        var start_point = [0, 0];

        // -- Interpolated values.
        // -- Order of transformations: object > curve.

        var has_target = obj.target != void(0);
        var target_vector = [0, 0];
        var target_vectorn = [0, 0];
        // has_target = false;

        var object_translation = [obj.interpolated[PROP_POSITION_X], obj.interpolated[PROP_POSITION_Y]];
        var object_rotation = obj.interpolated[PROP_ROTATION];
        var object_scaling = [obj.interpolated[PROP_SCALING_X], obj.interpolated[PROP_SCALING_Y]];

        // object_translation[0] = -50;
        // object_translation[1] = 50;

        var curve_translation = [0, 0];
        var curve_rotation = 0;

        var tg = obj.interpolated[PROP_OFFSET];

        if (bezier_curve.sync_movement)
            tg = bezier_sync_to_lut_from_tg(bezier_curve, tg);

        var tc = bezier_tc(bezier_curve, tg);
        curve_translation = bezier_compute_point(bezier_curve, tc);

        // When there is a target to follow the object rotation is ignored, the
        // rotation will be computed based on the target position.

        var tangent_vector = bezier_compute_first_derivative_point(bezier_curve, tc);
        vec_normalize(tangent_vector);

        if (obj.animation.follow_curve)
            curve_rotation = vector_to_angle_x(tangent_vector);

        var origin = [0, 0];
        var target_rotation = 0;

        origin = transform(origin, object_translation, deg2rad(object_rotation), object_scaling);
        origin = transform(origin, curve_translation, deg2rad(curve_rotation), [1, 1]);

        if (has_target)
        {
            var target_vector = vec_subtract(objects[obj.target].position, origin);
            var target_vectorn = [target_vector[0], target_vector[1]];

            object_rotation = 0;
            vec_normalize(target_vectorn);
            target_rotation = vector_to_angle_vector(target_vectorn, tangent_vector);
        }

        obj.position = origin;

        for (var i = 0; i < obj.points.length; ++i)
        {
            var point = obj.points[i];

            point = transform(point, vec_inverse(obj.origin_offset), 0, obj.scaling);
            point = transform(point, object_translation, deg2rad(object_rotation), object_scaling);
            point = transform(point, curve_translation, deg2rad(curve_rotation), [1, 1]);

            if (target_rotation)
                point = rotate_around_point(point, deg2rad(target_rotation), origin);

            point = point_to_screen(point);

            if (i == 0)
            {
                start_point = point;
                ctx.moveTo(point[0], point[1]);
            }
            else
                ctx.lineTo(point[0], point[1]);

            if (i == obj.points.length - 1)
                ctx.closePath();
        }

        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (graph_settings.debug_mode)
        {
            var x_axis_color = 'rgb(250, 50, 50)';
            var y_axis_color = 'rgb(50, 200, 50)';
            var curve_origin_color = 'rgb(100, 100, 100)';
            var target_color = 'rgb(200, 100, 20)';
            var axis_length = 50;
            var normal = vec_perp(tangent_vector);

            draw_debug_point(ctx, origin);
            draw_debug_vector(ctx, [0, 0], curve_translation, curve_origin_color);
            draw_debug_vector(ctx, curve_translation, vec_add(curve_translation, vec_muls(tangent_vector, axis_length)), x_axis_color);
            draw_debug_vector(ctx, curve_translation, vec_add(curve_translation, vec_muls(normal, axis_length)), y_axis_color);

            if (target_vectorn[0] || target_vectorn[1])
                draw_debug_vector(ctx, origin, vec_add(origin, target_vector), target_color);
        }
    };

    function draw_vector(ctx, start_point, end_point, overwrite)
    {
        var arrow_short_size = 0.9;
        var vector_color = graph_settings.tangent_color;
        var vector_width = graph_settings.tangent_width;
        var vector_dash = [];

        if (overwrite && overwrite.color)
            vector_color = overwrite.color;

        if (overwrite && overwrite.width)
            vector_width = overwrite.width;

        if (overwrite && overwrite.dash)
            vector_dash = overwrite.dash;

        // -- Base line.

        start_point = point_to_screen(start_point);
        end_point = point_to_screen(end_point);

        var v = vec_subtract(end_point, start_point);
        vec_normalize(v);
        var short_end_point = vec_subtract(end_point, vec_muls(v, graph_settings.tangent_arrow_size * (arrow_short_size - 0.02)));

        ctx.save();

        ctx.strokeStyle = vector_color;
        ctx.lineWidth = vector_width;
        ctx.setLineDash(vector_dash);

        ctx.beginPath();
        ctx.moveTo(start_point[0], start_point[1]);
        ctx.lineTo(short_end_point[0], short_end_point[1]);
        ctx.stroke();

        // -- Arrow.

        var perp = [-v[1], v[0]];
        var back = vec_subtract(end_point, vec_muls(v, graph_settings.tangent_arrow_size * arrow_short_size));
        var p3 = vec_add(back, vec_muls(perp, graph_settings.tangent_arrow_size * 0.5));
        var p4 = vec_add(back, vec_muls(perp, -graph_settings.tangent_arrow_size * 0.5));

        ctx.fillStyle = vector_color;
        ctx.strokeStyle = graph_settings.tangent_color;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(end_point[0], end_point[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p4[0], p4[1]);
        ctx.lineTo(end_point[0], end_point[1]);

        if (graph_settings.tangent_arrow_fill)
            ctx.fill();
        else
            ctx.stroke();

        ctx.beginPath();
        ctx.arc(start_point[0], start_point[1], 1.2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    };

    function draw_debug_vector(ctx, start, end, color) {
        draw_vector(ctx, start, end, {color: color, width: 2, dash: [5, 2]});
    };

    // ----------------------------------------------------------------------------------
    // -- Draw a bezier curve.
    // ----------------------------------------------------------------------------------

    function draw_curve(ctx, curve)
    {
        if (!curve.sections.length)
            return;

        ctx.save();

        // ----------------------------------------------------------------------------------
        // -- Base curve.
        // ----------------------------------------------------------------------------------

        var total_samples = curve.sections.length * curve.samples;
        var step = 1 / total_samples;

        ctx.strokeStyle = graph_settings.line_color;
        ctx.lineWidth = graph_settings.line_width;
        ctx.lineJoin = 'round';

        ctx.beginPath();

        for (var j = 0, tg = 0; j <= total_samples; ++j, tg += step)
        {
            var tc = bezier_tc(curve, tg);
            var interp_point = bezier_compute_point(curve, tc);
            interp_point = point_to_screen(interp_point);

            if (tc == 0)
                ctx.moveTo(interp_point[0], interp_point[1]);
            else
                ctx.lineTo(interp_point[0], interp_point[1]);
        }

        ctx.stroke();

        // ----------------------------------------------------------------------------------
        // -- Curve control tangents.
        // ----------------------------------------------------------------------------------

        if (curve.show_controls)
        {
            for (var i = 0; i < curve.points.length; ++i)
            {
                ctx.strokeStyle = graph_settings.control_tangent_color;
                ctx.lineWidth = graph_settings.control_tangent_width;

                var p = point_to_screen(curve.points[i][0]);
                var c1 = point_to_screen(curve.points[i][1]);
                var c2 = point_to_screen(curve.points[i][2]);

                ctx.beginPath();
                ctx.moveTo(p[0], p[1]);
                ctx.lineTo(c1[0], c1[1]);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(p[0], p[1]);
                ctx.lineTo(c2[0], c2[1]);
                ctx.stroke();
            }
        }

        // ----------------------------------------------------------------------------------
        // -- Control points.
        // ----------------------------------------------------------------------------------

        for (var i = 0; i < curve.points.length; ++i)
        {
            var p = curve.points[i];

            var p0 = point_to_screen(p[0]);
            var p1 = point_to_screen(p[1]);
            var p2 = point_to_screen(p[2]);

            ctx.font = "bold 11px Tahoma";
            ctx.fillStyle = '#555';

            var offset_x = 12;
            var offset_y = 4;

            if (i == 0 || i == curve.points.length - 1)
                draw_curve_base_point(ctx, p0, p[3] == 0);
            else
                draw_curve_midpoint(ctx, p0, p[3] == 0);

            ctx.fillText('P' + (i + 1), p0[0] + offset_x, p0[1] + offset_y);

            if (curve.show_controls)
            {
                draw_curve_control_point(ctx, p1, p[3] == 1);
                draw_curve_control_point(ctx, p2, p[3] == 2);
                ctx.fillText('C' + (i + 1) + '1', p1[0] + offset_x, p1[1] + offset_y);
                ctx.fillText('C' + (i + 1) + '2', p2[0] + offset_x, p2[1] + offset_y);
            }
        }

        // ----------------------------------------------------------------------------------
        // -- Arclen lut aproximation.
        // ----------------------------------------------------------------------------------

        if (curve.show_lut)
        {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([6, 2]);

            ctx.strokeStyle = graph_settings.line_color_lut;
            ctx.lineWidth = graph_settings.line_width_lut;

            for (var i = 0; i < curve.lut_total_samples; ++i)
            {
                var tg = i * curve.lut_step;

                if (curve.sync_movement)
                    tg = bezier_sync_to_lut_from_tg(curve, tg);

                var tc = bezier_tc(curve, tg);
                var point = bezier_compute_point(curve, tc);
                point = point_to_screen(point);

                if (i == 0)
                    ctx.moveTo(point[0], point[1]);
                else
                    ctx.lineTo(point[0], point[1]);
            }

            ctx.stroke();
            ctx.setLineDash([]);

            for (var i = 0; i < curve.lut_total_samples; ++i)
            {
                var tg = i * curve.lut_step;

                if (curve.sync_movement)
                    tg = bezier_sync_to_lut_from_tg(curve, tg);

                var tc = bezier_tc(curve, tg);
                var point = bezier_compute_point(curve, tc);
                point = point_to_screen(point);

                if (i > 0 && i < curve.lut_total_samples - 1)
                {
                    ctx.fillStyle = graph_settings.point_outer_color_lut;

                    ctx.beginPath();
                    ctx.arc(point[0], point[1], graph_settings.point_outer_radius_lut, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = graph_settings.point_inner_color_lut;

                    ctx.beginPath();
                    ctx.arc(point[0], point[1], graph_settings.point_inner_radius_lut, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }

            ctx.restore();
        }

        // ----------------------------------------------------------------------------------
        // -- Midpoints.
        // ----------------------------------------------------------------------------------

        if (curve.animate_points)
        {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = graph_settings.inter_point_color;
            ctx.lineWidth = graph_settings.inter_line_width;

            for (var i = 0; i < curve.moving_points_count; ++i)
            {
                var tg = curve.moving_points[i];

                if (curve.sync_movement)
                    tg = bezier_sync_to_lut_from_tg(curve, tg);

                var tc = bezier_tc(curve, tg);
                var midpoint = bezier_compute_point(curve, tc);
                midpoint = point_to_screen(midpoint);

                ctx.beginPath();
                ctx.arc(midpoint[0], midpoint[1], graph_settings.inter_point_radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }

            // The tangent is displayed only for the first point.
            if (curve.show_tangent && curve.moving_points.length)
            {
                var tg = curve.moving_points[0];

                if (curve.sync_movement)
                    tg = bezier_sync_to_lut_from_tg(curve, tg);

                var tc = bezier_tc(curve, tg);
                var start_point = bezier_compute_point(curve, tc);
                var tangent_point = bezier_compute_first_derivative_point(curve, tc);
                var end_point = vec_add(start_point, vec_muls(tangent_point, graph_settings.tangent_scale));

                draw_vector(ctx, start_point, end_point);
            }
        }

        ctx.restore();
    };

    function draw_curve_first_derivative(ctx, curve)
    {
        if (!curve.sections.length)
            return;

        ctx.save();

        // ----------------------------------------------------------------------------------
        // -- Base curve.
        // ----------------------------------------------------------------------------------

        var total_samples = curve.sections.length * curve.samples;
        var step = 1 / total_samples;

        ctx.strokeStyle = graph_settings.line_color;
        ctx.lineWidth = graph_settings.line_width;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        for (var j = 0, tg = 0; j <= total_samples; ++j, tg += step)
        {
            var tc = bezier_tc(curve, tg);
            var interp_point = bezier_compute_first_derivative_point(curve, tc);

            interp_point[0] *= graph_settings.tangent_scale;
            interp_point[1] *= graph_settings.tangent_scale;
            interp_point = point_to_screen(interp_point);

            if (tc == 0)
                ctx.moveTo(interp_point[0], interp_point[1]);
            else
                ctx.lineTo(interp_point[0], interp_point[1]);
        }

        ctx.stroke();

        // -- Base points.

        ctx.font = "bold 11px Tahoma";
        ctx.fillStyle = '#555';

        var offset_x = 12;
        var offset_y = 4;

        for (var i = 0; i <= curve.sections.length; ++i)
        {
            var point = bezier_compute_first_derivative_point(curve, i);
            point = vec_muls(point, graph_settings.tangent_scale);
            point = point_to_screen(point);

            if (i == 0 || i == curve.points.length - 1)
                draw_curve_base_point(ctx, point, false);
            else
                draw_curve_midpoint(ctx, point, false);

            ctx.fillText('P' + (i + 1), point[0] + offset_x, point[1] + offset_y);
        }

        // -- First point tangent.

        if (curve.show_tangent && curve.moving_points.length)
        {
            var origin = [0, 0];
            var tg = curve.moving_points[0];

            if (curve.sync_movement)
                tg = bezier_sync_to_lut_from_tg(curve, tg);

            var tc = bezier_tc(curve, tg);
            var tangent_point = bezier_compute_first_derivative_point(curve, tc);

            tangent_point[0] *= graph_settings.tangent_scale;
            tangent_point[1] *= graph_settings.tangent_scale;

            draw_vector(ctx, origin, tangent_point);
        }

        ctx.restore();
    };

    function draw_curve_second_derivative(ctx, curve)
    {
        if (!curve.sections.length)
            return;

        ctx.save();

        var scale_factor = 0.05;

        ctx.strokeStyle = graph_settings.line_color;
        ctx.lineWidth = graph_settings.line_width;
        ctx.lineJoin = 'round';

        // -- Base lines.

        ctx.beginPath();

        for (var i = 0; i < curve.sections.length; ++i)
        {
            var start = bezier_compute_second_derivative_point(curve, i, 0);
            var end = bezier_compute_second_derivative_point(curve, i, 1);

            start = vec_muls(start, scale_factor);
            start = point_to_screen(start);

            end = vec_muls(end, scale_factor);
            end = point_to_screen(end);

            ctx.moveTo(start[0], start[1]);
            ctx.lineTo(end[0], end[1]);
        }

        ctx.stroke();

        // -- Points.

        ctx.font = "bold 11px Tahoma";
        ctx.fillStyle = '#555';

        var offset_x = 12;
        var offset_y = 4;

        for (var i = 0; i < curve.sections.length; ++i)
        {
            var start = bezier_compute_second_derivative_point(curve, i, 0);
            start = vec_muls(start, scale_factor);
            start = point_to_screen(start);

            var end = bezier_compute_second_derivative_point(curve, i, 1);
            end = vec_muls(end, scale_factor);
            end = point_to_screen(end);

            draw_curve_base_point(ctx, start, false);
            draw_curve_base_point(ctx, end, false);

            ctx.fillText('P' + (i + 1), start[0] + offset_x, start[1] + offset_y);
            ctx.fillText('P' + (i + 2), end[0] + offset_x, end[1] + offset_y);
        }

        ctx.restore();
    };

    function draw_temp_points(ctx)
    {
        for (var i = 0; i < temp_points.length; ++i)
        {
            draw_curve_base_point(ctx, temp_points[i]);
            draw_curve_base_point(ctx, temp_points[i]);
        }
    };

    // ----------------------------------------------------------------------------------
    // -- Render function.
    // ----------------------------------------------------------------------------------

    function render(timestamp)
    {
        bezier_ctx.fillStyle = '#fff';
        bezier_ctx.fillRect(0, 0, WIDTH, HEIGHT);

        bezier_first_derivative_ctx.fillStyle = '#fff';
        bezier_first_derivative_ctx.fillRect(0, 0, WIDTH, HEIGHT);

        bezier_second_derivative_ctx.fillStyle = '#fff';
        bezier_second_derivative_ctx.fillRect(0, 0, WIDTH, HEIGHT);

        var delta = timestamp - prev_timestamp;
        prev_timestamp = timestamp;

        if (bezier_curve.speed_ms)
        {
            var step_t = delta / bezier_curve.speed_ms;

            // Animate the intemediary points.
            if (bezier_curve.animate_points)
                bezier_update_moving_points(bezier_curve, step_t);
        }

        draw_grid(bezier_ctx);
        draw_grid(bezier_first_derivative_ctx);
        draw_grid(bezier_second_derivative_ctx);

        // Draw the thing.
        draw_curve(bezier_ctx, bezier_curve);
        draw_curve_first_derivative(bezier_first_derivative_ctx, bezier_curve);
        draw_curve_second_derivative(bezier_second_derivative_ctx, bezier_curve);

        if (bezier_curve.edit_mode)
            draw_temp_points(bezier_ctx);

        if (bezier_curve.keyframes_mode)
        {
            update_objects(delta);

            for (var i = 0; i < objects.length; ++i) {
                draw_object(bezier_ctx, objects[i]);
            }
        }

        window.requestAnimationFrame(render);
    };

    window.requestAnimationFrame(render);

    function vec3_dot(v1, v2) {
        return (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]);
    };

    function vec3_len(v) {
        return Math.sqrt(vec3_dot(v, v));
    };

    function vec3_normalize(v)
    {
        var len = 1 / vec3_len(v);

        v[0] *= len;
        v[1] *= len;
        v[2] *= len;

        return v;
    };

    function vec3_cross(v1, v2)
    {
        var res = [0, 0, 0];

        res[0] = v1[1] * v2[2] - v1[2] * v2[1];
        res[1] = v1[2] * v2[0] - v1[0] * v2[2];
        res[2] = v1[0] * v2[1] - v1[1] * v2[0];

        return res;
    };

    function vec_xoy_proj(v)
    {
        var res = [0, 0, 0];

        res[0] = v[0];
        res[1] = v[1];

        return res;
    };

    function vec_xoz_proj(v)
    {
        var res = [0, 0, 0];

        res[0] = v[0];
        res[2] = v[2];

        return res;
    };

    // TEST function.
    function vector3_to_angle_vector3(v, ref_v, sign_vec)
    {
        vec3_normalize(v);
        vec3_normalize(ref_v);

        var n = vec3_cross(ref_v, v);
        var sin = vec3_len(n);
        var cos = vec3_dot(v, ref_v);
        var sign = vec3_dot(sign_vec, n);

        var angle = Math.atan2(sin, cos);

        if (sign < 0)
            angle = 2 * Math.PI - angle;

        return rad2deg(angle);
    };

    // 0x reference for heading, oz reference for pitch.
    function vector3_polar_angles(v)
    {
        var p = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        var res = [
            rad2deg(Math.atan2(v[1], v[0])),
            rad2deg(Math.atan2(p, v[2]))
        ];

        return res;
    };

    function vector3_polar_angles2(v)
    {
        var p = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        var res = [
            rad2deg(Math.atan2(v[1], v[0])),
            rad2deg(Math.atan2(v[2], p))
        ];

        return res;
    };
});
























