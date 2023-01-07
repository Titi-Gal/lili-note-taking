$('.script-items-btns-toggle').on('focus', function() {
    $('.script-hide').addClass('script-display-none');
    $(this).parent().next().removeClass('script-display-none');
});

$('input').on('focus', function() {
    $('.script-hide').addClass('script-display-none');
});

$('#goto-btn').on('click', function(event) {
    event.stopPropagation();
    let position = $(this).position().top;
    let height = $(this).height();
    position = (position + height + 6) + 'px';
    $('.script-hide').addClass('script-display-none')
    if ($('#goto-menu').hasClass('script-display-none')) {
        $('#goto-menu').removeClass('script-display-none');
    } else {
        $('#goto-menu').addClass('script-display-none');
    }
    $('#goto-menu').css('top', position);
})

$('html').on('click', function() {
    if (!$('#goto-menu').hasClass('script-display-none')) {
        $('#goto-menu').addClass('script-display-none');
    }
})

$('textarea').on('focusout', function() {
    const jthis = $(this);
    const defauttext = jthis.attr('defauttext');
    const itemtext = jthis.val().trim();
    const form = jthis.parent();
    if (!itemtext ||defauttext === itemtext ) {
        jthis.val(defauttext);
    }
    else if(defauttext !== itemtext) {
        form.submit();
    }
})

$('.lili-title').toArray().forEach(liliTitle => {
    let fontSize = $(liliTitle).prev().css("fontSize");
    if (fontSize !== undefined) {
        fontSize = parseInt(fontSize.slice(0, fontSize.length -2));
        fontSize = fontSize * 0.85;
        liliTitle.style.fontSize = fontSize + "px";
    }
});

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    $('link[rel="icon"]').attr('href', "resources/lili-logo-darkmode.svg")
}

$('form').on('submit', function(event) {
    if ($(this).hasClass('delete-form') && !confirm('delete this item and its childs?')) {
        event.preventDefault();
    } else {
        $('body').addClass('hide');
    }
})

$('a').on('click', function(event) {
    $('body').addClass('hide');
})